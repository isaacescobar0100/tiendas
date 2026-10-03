// Confirmación de pago de un pedido. Compartido por la página de éxito
// (redirección de Wompi) y el webhook, de forma que solo se marque y notifique
// una vez aunque ambos lleguen (idempotente).
import type { Fulfillment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { tracksStock } from "@/lib/store-type";
import {
  findTransactionByReference,
  resolveWompiKeys,
  type WompiTransaction,
} from "@/lib/wompi";

/**
 * Marca el pedido como PAGADO con una transacción de Wompi y envía los emails,
 * solo si la transacción corresponde de verdad a este pedido:
 *  - está APROBADA y su referencia es el id del pedido,
 *  - el monto y la moneda son exactamente los del pedido,
 *  - el pedido es de pago en línea (no contraentrega ni transferencia),
 *  - el pedido estaba PENDIENTE y no se había pagado ya con otra transacción.
 * Devuelve true si esta llamada realizó la transición.
 */
export async function markOrderPaid(
  orderId: string,
  tx: WompiTransaction,
): Promise<boolean> {
  if (tx.status !== "APPROVED" || tx.reference !== orderId) return false;
  // Transición atómica PENDING → PAID con todas las condiciones en el WHERE:
  // solo una llamada gana la carrera y nunca con un monto distinto.
  const res = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
      totalCents: tx.amount_in_cents,
      currency: tx.currency,
      wompiTransactionId: null,
      // Pedidos antiguos no tienen método guardado (null).
      OR: [{ paymentMethod: "ONLINE" }, { paymentMethod: null }],
    },
    data: { status: "PAID", wompiTransactionId: tx.id },
  });
  if (res.count === 0) return false; // ya procesado, no existe o no coincide

  // Cargamos los datos para el email (después de la transición).
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      store: { include: { owner: { select: { email: true } } } },
    },
  });
  if (!order) return true;

  // Ahora que el pago está confirmado, descontamos el stock (una sola vez,
  // porque la transición PENDING→PAID de arriba solo la gana una llamada).
  // Si algo se agotó entre tanto, dejamos el stock en 0 (nunca negativo); el
  // dueño verá el pedido y lo gestiona. La comida no controla stock.
  if (tracksStock(order.store.type))
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const qty = item.quantity;
      if (item.variantId) {
        const r = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (r.count === 0) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: 0 },
          });
        }
      } else if (item.productId) {
        const r = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (r.count === 0) {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: 0 },
          });
        }
      }
    }
  });

  await sendOrderEmails({
    orderId: order.id,
    storeName: order.store.name,
    currency: order.currency,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    locationName: order.locationName,
    address: order.address,
    reference: order.reference,
    paymentLabel: "Pagado en línea",
    adminEmail: order.store.owner?.email,
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
      color: i.color,
      size: i.size,
      modifiers: i.modifiers,
    })),
  });
  return true;
}

type StockLine = { variantId: string | null; productId: string | null; quantity: number };

/** Devuelve al inventario las unidades de un pedido (al cancelarlo). */
async function restock(lines: StockLine[]) {
  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      if (l.variantId) {
        await tx.productVariant.updateMany({
          where: { id: l.variantId },
          data: { stock: { increment: l.quantity } },
        });
      } else if (l.productId) {
        await tx.product.updateMany({
          where: { id: l.productId },
          data: { stock: { increment: l.quantity } },
        });
      }
    }
  });
}

/** Descuenta del inventario (al marcar pagado a mano un pedido en línea). */
async function takeStock(lines: StockLine[]) {
  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      if (l.variantId) {
        const r = await tx.productVariant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (r.count === 0) {
          await tx.productVariant.updateMany({ where: { id: l.variantId }, data: { stock: 0 } });
        }
      } else if (l.productId) {
        const r = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (r.count === 0) {
          await tx.product.updateMany({ where: { id: l.productId }, data: { stock: 0 } });
        }
      }
    }
  });
}

/**
 * Cambio manual del estado de PAGO (admin o sede), con reglas:
 *  - Un pedido CANCELADO no se reabre.
 *  - Un pedido PAGADO no vuelve a PENDIENTE (evita que se "pague" dos veces).
 *  - Al CANCELAR se devuelve el stock que el pedido había reservado
 *    (contraentrega/transferencia lo reservan al crearse; en línea, al pagarse).
 *  - Marcar PAGADO a mano un pedido en línea descuenta su stock.
 * `scope` limita qué pedidos puede tocar quien llama (tienda, y sede si aplica).
 * Devuelve true si cambió el estado.
 */
export async function setOrderPaymentStatus(
  scope: { id: string; storeId: string; locationName?: string },
  next: "PENDING" | "PAID" | "CANCELLED",
): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: scope,
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      store: { select: { type: true } },
      items: { select: { variantId: true, productId: true, quantity: true } },
    },
  });
  if (!order) return false;
  const current = order.status === "SHIPPED" ? "PAID" : order.status; // legado
  if (current === next) return false;
  if (current === "CANCELLED") return false;
  if (current === "PAID" && next === "PENDING") return false;

  // Transición atómica: solo si el estado sigue siendo el que leímos.
  const res = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: next },
  });
  if (res.count === 0) return false;

  if (!tracksStock(order.store.type)) return true;
  const reservedAtCreation =
    order.paymentMethod === "COD" || order.paymentMethod === "TRANSFER";
  const isOnline = order.paymentMethod === "ONLINE";

  if (next === "CANCELLED") {
    const hadStock = reservedAtCreation || (isOnline && current === "PAID");
    if (hadStock) await restock(order.items);
  } else if (next === "PAID" && isOnline) {
    await takeStock(order.items);
  }
  return true;
}

/**
 * Al avisar al cliente ("confirmado" / "va en camino") el pedido avanza a ese
 * estado. Solo hacia adelante y nunca en pedidos cancelados: reenviar un aviso
 * viejo no hace retroceder un pedido ya entregado.
 */
export async function advanceFulfillment(
  scope: { id: string; storeId: string; locationName?: string },
  to: "CONFIRMED" | "SHIPPED",
) {
  const from: Fulfillment[] =
    to === "CONFIRMED" ? ["PENDING"] : ["PENDING", "CONFIRMED"];
  await prisma.order.updateMany({
    where: { ...scope, status: { not: "CANCELLED" }, fulfillment: { in: from } },
    data: { fulfillment: to },
  });
}

/**
 * Concilia con Wompi los pedidos EN LÍNEA que siguen pendientes: si el pago
 * quedó aprobado en Wompi pero no llegó el webhook (o el cliente cerró la
 * pestaña sin volver), los marca pagados con las mismas comprobaciones de
 * markOrderPaid (monto, moneda, método). Solo pedidos recientes y un máximo
 * por llamada, para no saturar a Wompi. `scope` limita a la tienda/sede.
 */
export async function reconcileOnlineOrders(
  scope: { storeId: string; locationName?: string; id?: string },
  { maxAgeHours = 72, limit = 10 } = {},
): Promise<number> {
  const pending = await prisma.order.findMany({
    where: {
      ...scope,
      paymentMethod: "ONLINE",
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - maxAgeHours * 3_600_000) },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      store: {
        select: {
          wompiPublicKey: true,
          wompiPrivateKey: true,
          wompiIntegritySecret: true,
          wompiEventsSecret: true,
        },
      },
    },
  });
  const done = await Promise.all(
    pending.map(async (o) => {
      const tx = await findTransactionByReference(o.id, resolveWompiKeys(o.store));
      return tx ? markOrderPaid(o.id, tx) : false;
    }),
  );
  return done.filter(Boolean).length;
}
