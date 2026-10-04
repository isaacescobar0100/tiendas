"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSuspended } from "@/lib/billing";
import { sendOrderEmails } from "@/lib/email";
import {
  isWompiConfigured,
  buildCheckoutUrl,
  resolveWompiKeys,
} from "@/lib/wompi";
import { computeShipping } from "@/lib/shipping";
import { effectivePriceCents } from "@/lib/pricing";
import { activeDiscounts, applyDiscount } from "@/lib/discounts";
import { getStoreOpenState, isMerchProduct } from "@/lib/store-hours";
import { tracksStock } from "@/lib/store-type";
import { parseModifiers, resolveSelection } from "@/lib/modifiers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { storeOrigin } from "@/lib/store-path";
import { parseTransferAccounts } from "@/lib/payment-methods";
import type { PaymentMethod } from "@prisma/client";

// `checkoutUrl` presente = hay que redirigir al cliente a pagar en Wompi.
export type CheckoutState =
  | { error?: string; orderId?: string; checkoutUrl?: string }
  | undefined;

const customerSchema = z.object({
  customerName: z.string().trim().min(2, "Indica tu nombre.").max(80, "El nombre es muy largo."),
  customerEmail: z.string().trim().email("Email inválido.").max(200),
  // Obligatorio y validado: móvil colombiano (10 dígitos), para poder avisar por WhatsApp.
  customerPhone: z
    .string()
    .min(1, "Indica tu número de WhatsApp.")
    .max(30, "Número inválido.")
    // Solo dígitos, espacios, +, guiones y paréntesis.
    .refine((v) => /^[\d\s+()-]+$/.test(v), "Número inválido.")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 10 || (d.length === 12 && d.startsWith("57"));
    }, "Número inválido. Usa un móvil de 10 dígitos (ej. 300 123 4567)."),
  // `street` = dirección completa (calle/carrera, número, apto…)
  street: z.string().trim().min(3, "Indica la dirección completa.").max(200),
  neighborhood: z.string().trim().min(2, "Indica el barrio.").max(100),
  city: z.string().trim().min(2, "Indica la ciudad.").max(100),
  reference: z.string().trim().max(300).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2, "Indica el país.").max(60),
});

// Límites por pedido: evitan que un solo pedido anónimo (contraentrega o
// transferencia, que reservan stock al crearse) vacíe el inventario.
const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 20;

const itemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().nullable().optional(),
      quantity: z
        .number()
        .int()
        .positive()
        .max(MAX_QTY_PER_LINE, `Máximo ${MAX_QTY_PER_LINE} unidades por producto.`),
      modifierOptionIds: z.array(z.string()).max(50).optional(),
    }),
  )
  .max(MAX_LINES, `Máximo ${MAX_LINES} productos por pedido.`);

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const rl = await rateLimit(`checkout:${await clientIp()}`, 15, 5 * 60 * 1000);
  if (!rl.ok) {
    return {
      error: `Demasiados intentos. Espera ${rl.retryAfter}s e inténtalo de nuevo.`,
    };
  }

  const storeSlug = String(formData.get("storeSlug") ?? "");

  const parsed = customerSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") ?? "",
    street: formData.get("street"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    reference: formData.get("reference") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    country: formData.get("country"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  // Resumen legible de la dirección completa
  const address = [
    d.street,
    `Barrio ${d.neighborhood}`,
    d.postalCode ? `${d.postalCode} ${d.city}` : d.city,
    d.country,
  ].join(", ");

  let items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    modifierOptionIds?: string[];
  }[];
  try {
    items = itemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]")));
  } catch {
    return { error: "Carrito inválido." };
  }
  if (items.length === 0) return { error: "Tu carrito está vacío." };

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    include: {
      owner: { select: { email: true } },
      locations: { select: { name: true } },
    },
  });
  if (!store) return { error: "Tienda no encontrada." };
  // Plan vencido (fuera del periodo de gracia): la tienda no recibe pedidos.
  if (isSuspended(store)) {
    return { error: "Esta tienda no está recibiendo pedidos en este momento." };
  }

  // Fuera del horario de atención solo se aceptan pedidos de merch
  // (productos con alwaysAvailable). La validación por producto va más abajo.
  const openState = getStoreOpenState(store.hoursJson);
  const storeClosed = openState.enforced && !openState.isOpen;
  // Comida (a la carta): no se controla stock.
  const tracks = tracksStock(store.type);

  // Si la tienda tiene sedes, el cliente debe elegir una válida.
  let locationName: string | null = null;
  if (store.locations.length > 0) {
    const chosen = String(formData.get("locationName") ?? "").trim();
    const valid = store.locations.some((l) => l.name === chosen);
    if (!valid) return { error: "Elige una sede para tu pedido." };
    locationName = chosen;
  }

  // Resuelve el método de pago según lo elegido y lo que la tienda permite.
  const wompiKeys = resolveWompiKeys(store);
  const onlineAvailable = store.onlinePaymentEnabled && isWompiConfigured(wompiKeys);
  const codAvailable = store.codEnabled;
  const transferAvailable =
    store.transferEnabled &&
    parseTransferAccounts(store.transferAccountsJson).length > 0;
  const available: PaymentMethod[] = [
    ...(onlineAvailable ? (["ONLINE"] as const) : []),
    ...(codAvailable ? (["COD"] as const) : []),
    ...(transferAvailable ? (["TRANSFER"] as const) : []),
  ];
  const requested = (
    { online: "ONLINE", cod: "COD", transfer: "TRANSFER" } as const
  )[String(formData.get("paymentMethod") ?? "") as "online" | "cod" | "transfer"];
  // Lo pedido si está disponible; si no, el único disponible (si solo hay uno).
  const paymentMethod: PaymentMethod | undefined =
    requested && available.includes(requested)
      ? requested
      : available.length === 1
        ? available[0]
        : undefined;
  if (!paymentMethod) return { error: "Método de pago no disponible." };
  const useOnline = paymentMethod === "ONLINE";

  // Carga los productos (con sus tallas) y valida contra la BD
  const products = await prisma.product.findMany({
    where: {
      id: { in: items.map((i) => i.productId) },
      storeId: store.id,
      active: true,
    },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems: {
    productId: string;
    variantId: string | null;
    name: string;
    color: string | null;
    size: string | null;
    modifiers: string | null;
    imageUrl: string | null;
    priceCents: number;
    quantity: number;
  }[] = [];
  let totalCents = 0;
  // Descuentos vigentes: el mismo cálculo que vio el cliente en la tienda.
  const rules = await activeDiscounts(store.id);
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return { error: `Un producto ya no está disponible.` };

    // Fuera de horario, solo el merch (por categoría) se puede pedir.
    if (storeClosed && !isMerchProduct(product.categoryId, store.merchCategoryIds)) {
      return {
        error: `"${product.name}" solo se puede pedir en horario de atención.${openState.message ? ` ${openState.message}.` : ""}`,
      };
    }

    // Adiciones/opciones: se validan y se recalcula el precio en el servidor
    // (no confiamos en el cliente).
    const groups = parseModifiers(product.modifiersJson);
    const sel = resolveSelection(groups, item.modifierOptionIds ?? []);
    if (!sel.ok) return { error: `${product.name}: ${sel.error}` };
    const modifiersLabel = sel.label || null;

    // Precio a cobrar: el de oferta o descuento vigente (si no, el normal) +
    // adiciones. Calculado aquí, en el servidor: el cliente no lo decide.
    const unitCents = effectivePriceCents(applyDiscount(product, rules)) + sel.addedCents;

    if (product.variants.length > 0) {
      // El producto tiene variantes: se exige elegir una válida con stock
      if (!item.variantId) {
        return { error: `Elige las opciones de "${product.name}".` };
      }
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        return { error: `Opción no disponible en "${product.name}".` };
      }
      if (variant.stock < item.quantity) {
        const label = [variant.color, variant.size].filter(Boolean).join(" ");
        return { error: `Sin stock de "${product.name}" ${label}.` };
      }
      totalCents += unitCents * item.quantity;
      lineItems.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        color: variant.color || null,
        size: variant.size || null,
        modifiers: modifiersLabel,
        imageUrl: product.imageUrl,
        priceCents: unitCents,
        quantity: item.quantity,
      });
    } else {
      // Producto sin variantes: stock a nivel de producto (salvo comida).
      if (tracks && product.stock < item.quantity) {
        return { error: `Sin stock suficiente de "${product.name}".` };
      }
      totalCents += unitCents * item.quantity;
      lineItems.push({
        productId: product.id,
        variantId: null,
        name: product.name,
        color: null,
        size: null,
        modifiers: modifiersLabel,
        imageUrl: product.imageUrl,
        priceCents: unitCents,
        quantity: item.quantity,
      });
    }
  }

  // `totalCents` es el subtotal de productos. Añadimos el envío (calculado en
  // el servidor, no confiamos en el cliente).
  const subtotalCents = totalCents;
  const shippingCents = computeShipping(subtotalCents, {
    shippingCents: store.shippingCents,
    freeShippingOverCents: store.freeShippingOverCents,
  });
  const grandTotalCents = subtotalCents + shippingCents;

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Contraentrega: el pedido queda comprometido, así que descontamos el
      // stock ya. Pago en línea: NO se descuenta aquí; se descuenta cuando el
      // pago se confirma (markOrderPaid), para no perder stock si el pago falla.
      if (!useOnline && tracks) {
        // La condición `gte` evita quedar en negativo.
        for (const line of lineItems) {
          if (line.variantId) {
            const res = await tx.productVariant.updateMany({
              where: { id: line.variantId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (res.count === 0) throw new Error("STOCK");
          } else {
            const res = await tx.product.updateMany({
              where: { id: line.productId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (res.count === 0) throw new Error("STOCK");
          }
        }
      }
      return tx.order.create({
        data: {
          storeId: store.id,
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          customerPhone: d.customerPhone ?? null,
          locationName,
          paymentMethod,
          street: d.street,
          neighborhood: d.neighborhood,
          city: d.city,
          reference: d.reference ?? null,
          postalCode: d.postalCode ?? null,
          country: d.country,
          address,
          totalCents: grandTotalCents,
          shippingCents,
          currency: store.currency,
          items: {
            create: lineItems.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              name: l.name,
              color: l.color,
              size: l.size,
              modifiers: l.modifiers,
              imageUrl: l.imageUrl,
              priceCents: l.priceCents,
              quantity: l.quantity,
            })),
          },
        },
      });
    });

    // Pago en línea: no enviamos email todavía (el pedido aún no está pagado).
    // Redirigimos al cliente a pagar; el email sale al confirmarse.
    if (useOnline) {
      // Retorno desde Wompi: dirección de la tienda (su subdominio/dominio solo
      // si está comprobado que es suyo; si no, el dominio principal).
      const redirectUrl = `${await storeOrigin(store)}/checkout/success?order=${order.id}`;
      const checkoutUrl = buildCheckoutUrl(
        {
          reference: order.id,
          amountInCents: grandTotalCents,
          redirectUrl,
          customerEmail: d.customerEmail,
        },
        wompiKeys,
      );
      return { orderId: order.id, checkoutUrl };
    }

    // Contraentrega / transferencia: el pedido queda registrado y se paga al
    // recibir o por transferencia (la tienda lo marca pagado al verificarlo).
    // Emails de confirmación (no bloquea si el envío no está configurado o falla)
    // El correo de confirmación va a un email que nadie verificó: máx. 5 por
    // dirección y hora, para que el checkout no sirva para mandar correos
    // masivos a terceros con la marca de la tienda.
    const mailOk = (
      await rateLimit(`order-mail:${d.customerEmail.toLowerCase()}`, 5, 60 * 60 * 1000)
    ).ok;
    await sendOrderEmails({
      orderId: order.id,
      storeName: store.name,
      brand: { name: store.name, color: store.themeColor, logoUrl: store.logoUrl },
      currency: store.currency,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone ?? null,
      locationName,
      address,
      reference: d.reference ?? null,
      paymentLabel:
        paymentMethod === "TRANSFER"
          ? "Transferencia / QR (pendiente de verificar)"
          : "Contra entrega (pago al recibir)",
      adminEmail: store.owner?.email,
      totalCents: grandTotalCents,
      shippingCents,
      items: lineItems.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        priceCents: l.priceCents,
        color: l.color,
        size: l.size,
        modifiers: l.modifiers,
      })),
    }, { toCustomer: mailOk });

    return { orderId: order.id };
  } catch {
    return {
      error: "No se pudo completar el pedido (stock insuficiente). Inténtalo de nuevo.",
    };
  }
}
