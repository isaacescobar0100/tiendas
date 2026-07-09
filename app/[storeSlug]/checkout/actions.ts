"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { isWompiConfigured, buildCheckoutUrl } from "@/lib/wompi";
import { computeShipping } from "@/lib/shipping";
import { effectivePriceCents } from "@/lib/pricing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// `checkoutUrl` presente = hay que redirigir al cliente a pagar en Wompi.
export type CheckoutState =
  | { error?: string; orderId?: string; checkoutUrl?: string }
  | undefined;

const customerSchema = z.object({
  customerName: z.string().min(2, "Indica tu nombre."),
  customerEmail: z.string().email("Email inválido."),
  // Obligatorio y validado: móvil colombiano (10 dígitos), para poder avisar por WhatsApp.
  customerPhone: z
    .string()
    .min(1, "Indica tu número de WhatsApp.")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 10 || (d.length === 12 && d.startsWith("57"));
    }, "Número inválido. Usa un móvil de 10 dígitos (ej. 300 123 4567)."),
  // `street` = dirección completa (calle/carrera, número, apto…)
  street: z.string().min(3, "Indica la dirección completa."),
  neighborhood: z.string().min(2, "Indica el barrio."),
  city: z.string().min(2, "Indica la ciudad."),
  reference: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2, "Indica el país."),
});

const itemsSchema = z.array(
  z.object({
    productId: z.string().min(1),
    variantId: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
  }),
);

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const rl = rateLimit(`checkout:${await clientIp()}`, 15, 5 * 60 * 1000);
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
  }[];
  try {
    items = itemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]")));
  } catch {
    return { error: "Carrito inválido." };
  }
  if (items.length === 0) return { error: "Tu carrito está vacío." };

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    include: { owner: { select: { email: true } } },
  });
  if (!store) return { error: "Tienda no encontrada." };

  // Resuelve el método de pago según lo elegido y lo que la tienda permite.
  const onlineAvailable = store.onlinePaymentEnabled && isWompiConfigured();
  const codAvailable = store.codEnabled;
  const requested = String(formData.get("paymentMethod") ?? "");
  let useOnline: boolean;
  if (requested === "online" && onlineAvailable) useOnline = true;
  else if (requested === "cod" && codAvailable) useOnline = false;
  else if (onlineAvailable && !codAvailable) useOnline = true;
  else if (codAvailable && !onlineAvailable) useOnline = false;
  else return { error: "Método de pago no disponible." };

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
    imageUrl: string | null;
    priceCents: number;
    quantity: number;
  }[] = [];
  let totalCents = 0;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) return { error: `Un producto ya no está disponible.` };

    // Precio a cobrar: el de oferta si es válido, si no el normal.
    const unitCents = effectivePriceCents(product);

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
        imageUrl: product.imageUrl,
        priceCents: unitCents,
        quantity: item.quantity,
      });
    } else {
      // Producto sin variantes: stock a nivel de producto
      if (product.stock < item.quantity) {
        return { error: `Sin stock suficiente de "${product.name}".` };
      }
      totalCents += unitCents * item.quantity;
      lineItems.push({
        productId: product.id,
        variantId: null,
        name: product.name,
        color: null,
        size: null,
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
      if (!useOnline) {
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
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
      const proto = h.get("x-forwarded-proto") ?? "http";
      const redirectUrl = `${proto}://${host}/${storeSlug}/checkout/success?order=${order.id}`;
      const checkoutUrl = buildCheckoutUrl({
        reference: order.id,
        amountInCents: grandTotalCents,
        redirectUrl,
        customerEmail: d.customerEmail,
      });
      return { orderId: order.id, checkoutUrl };
    }

    // Contraentrega: el pedido queda registrado y se pagará al recibir.
    // Emails de confirmación (no bloquea si Resend no está configurado o falla)
    await sendOrderEmails({
      orderId: order.id,
      storeName: store.name,
      currency: store.currency,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone ?? null,
      address,
      reference: d.reference ?? null,
      paymentLabel: "Contra entrega (pago al recibir)",
      adminEmail: store.owner?.email,
      totalCents: grandTotalCents,
      shippingCents,
      items: lineItems.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        priceCents: l.priceCents,
        color: l.color,
        size: l.size,
      })),
    });

    return { orderId: order.id };
  } catch {
    return {
      error: "No se pudo completar el pedido (stock insuficiente). Inténtalo de nuevo.",
    };
  }
}
