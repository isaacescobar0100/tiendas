// Confirmación de pago de un pedido. Compartido por la página de éxito
// (redirección de Wompi) y el webhook, de forma que solo se marque y notifique
// una vez aunque ambos lleguen (idempotente).
import type { Fulfillment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
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
  // Si algo se agotó entre tanto, el stock queda en 0 (nunca negativo) y se
  // anota lo que de verdad se descontó. La comida no controla stock.
  if (tracksStock(order.store.type)) await takeStock(order.items);

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
    notes: order.notes,
    paymentLabel: "Pagado en línea",
    adminEmail: order.store.owner?.email,
    brand: { name: order.store.name, color: order.store.themeColor, logoUrl: order.store.logoUrl },
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
      color: i.color,
      size: i.size,
      modifiers: i.modifiers,
      note: i.note,
    })),
  });
  return true;
}

type StockLine = {
  id: string;
  variantId: string | null;
  productId: string | null;
  quantity: number;
  stockTaken: number | null;
};

/**
 * Descuenta hasta `qty` unidades sin bajar de 0 y devuelve cuántas se
 * descontaron de verdad (una sola sentencia, con la fila bloqueada).
 */
async function decrementUpTo(tx: Prisma.TransactionClient, l: StockLine, qty: number): Promise<number> {
  const rows = l.variantId
    ? await tx.$queryRaw<{ taken: number }[]>`
        UPDATE "ProductVariant" v SET stock = GREATEST(v.stock - ${qty}, 0)
        FROM (SELECT id, stock AS old FROM "ProductVariant" WHERE id = ${l.variantId} FOR UPDATE) o
        WHERE v.id = o.id
        RETURNING GREATEST(LEAST(o.old, ${qty}), 0)::int AS taken`
    : l.productId
      ? await tx.$queryRaw<{ taken: number }[]>`
          UPDATE "Product" p SET stock = GREATEST(p.stock - ${qty}, 0)
          FROM (SELECT id, stock AS old FROM "Product" WHERE id = ${l.productId} FOR UPDATE) o
          WHERE p.id = o.id
          RETURNING GREATEST(LEAST(o.old, ${qty}), 0)::int AS taken`
      : [];
  return Number(rows[0]?.taken ?? 0);
}

/** Descuenta del inventario las unidades de un pedido y anota cuántas tomó. */
async function takeStock(lines: StockLine[]) {
  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      const taken = await decrementUpTo(tx, l, l.quantity);
      await tx.orderItem.update({ where: { id: l.id }, data: { stockTaken: taken } });
    }
  });
}

/**
 * Devuelve al inventario lo que el pedido había descontado (y lo deja en 0).
 * Pedidos anteriores al registro (stockTaken null): se devuelve la cantidad
 * completa solo si `legacyTaken` (las reglas de antes).
 */
async function restock(lines: StockLine[], legacyTaken: boolean) {
  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      const n = l.stockTaken ?? (legacyTaken ? l.quantity : 0);
      if (n > 0 && l.variantId) {
        await tx.productVariant.updateMany({ where: { id: l.variantId }, data: { stock: { increment: n } } });
      } else if (n > 0 && l.productId) {
        await tx.product.updateMany({ where: { id: l.productId }, data: { stock: { increment: n } } });
      }
      await tx.orderItem.update({ where: { id: l.id }, data: { stockTaken: 0 } });
    }
  });
}

export type PaymentChange = { ok: true } | { ok: false; error: string };

/**
 * Cambio manual del estado de PAGO (admin o sede), con reglas:
 *  - Un pedido CANCELADO no se reabre (su stock ya se devolvió).
 *  - PAGADO → PENDIENTE se permite para corregir un error (ej. una
 *    transferencia marcada por equivocación), salvo si el pago lo confirmó
 *    Wompi: ese dinero sí entró.
 *  - Al CANCELAR se devuelve el stock que el pedido había reservado
 *    (contraentrega/transferencia lo reservan al crearse; en línea, al pagarse).
 *  - Marcar PAGADO a mano un pedido en línea descuenta su stock (y volverlo a
 *    pendiente lo devuelve).
 * `scope` limita qué pedidos puede tocar quien llama (tienda, y sede si aplica).
 * Si no se puede, devuelve el motivo para mostrárselo a quien lo intentó.
 */
export async function setOrderPaymentStatus(
  scope: { id: string; storeId: string; locationName?: string },
  next: "PENDING" | "PAID" | "CANCELLED",
): Promise<PaymentChange> {
  const order = await prisma.order.findFirst({
    where: scope,
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      wompiTransactionId: true,
      store: { select: { type: true } },
      items: { select: { id: true, variantId: true, productId: true, quantity: true, stockTaken: true } },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  const current = order.status === "SHIPPED" ? "PAID" : order.status; // legado
  if (current === next) return { ok: true };
  if (current === "CANCELLED") {
    return { ok: false, error: "Un pedido cancelado no se puede reabrir." };
  }
  if (current === "PAID" && next === "PENDING" && order.wompiTransactionId) {
    return { ok: false, error: "Este pago lo confirmó Wompi: no se puede volver a pendiente." };
  }

  // Transición atómica: solo si el estado sigue siendo el que leímos.
  // (Al volver a pendiente, además, que Wompi no lo haya pagado entre tanto.)
  const res = await prisma.order.updateMany({
    where: { id: order.id, status: order.status, ...(next === "PENDING" ? { wompiTransactionId: null } : {}) },
    data: { status: next },
  });
  if (res.count === 0) {
    return { ok: false, error: "El pedido cambió mientras tanto. Vuelve a intentarlo." };
  }

  if (!tracksStock(order.store.type)) return { ok: true };
  const reservedAtCreation =
    order.paymentMethod === "COD" || order.paymentMethod === "TRANSFER";
  // Pedidos antiguos sin método guardado (null) se pagaban en línea: así los
  // trata también markOrderPaid.
  const isOnline = order.paymentMethod === "ONLINE" || order.paymentMethod === null;

  if (next === "CANCELLED") {
    // Se devuelve lo que se descontó (registrado en cada línea).
    await restock(order.items, reservedAtCreation || (isOnline && current === "PAID"));
  } else if (next === "PAID" && isOnline) {
    await takeStock(order.items);
  } else if (next === "PENDING" && isOnline && current === "PAID") {
    // Se había marcado pagado a mano: ese descuento de stock se deshace.
    await restock(order.items, true);
  }
  return { ok: true };
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
  // Como mucho una consulta a Wompi por minuto y tienda (o por pedido, si se
  // pide uno concreto), por muchas páginas del admin que se abran.
  const throttle = await rateLimit(`wompi-reconcile:${scope.id ?? scope.storeId}`, 1, 60_000);
  if (!throttle.ok) return 0;
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
