// Confirmación de pago de un pedido. Compartido por la página de éxito
// (redirección de Wompi) y el webhook, de forma que solo se marque y notifique
// una vez aunque ambos lleguen (idempotente).
import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";

/**
 * Marca el pedido como PAGADO y envía los emails de confirmación, pero solo si
 * estaba PENDIENTE. Si ya estaba pagado (u otro estado), no hace nada.
 * Devuelve true si esta llamada realizó la transición.
 */
export async function markOrderPaid(orderId: string): Promise<boolean> {
  // Transición atómica PENDING → PAID: solo una llamada gana la carrera.
  const res = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID" },
  });
  if (res.count === 0) return false; // ya procesado o no existe

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
  // dueño verá el pedido y lo gestiona.
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
    adminEmail: order.store.owner?.email,
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
    })),
  });
  return true;
}
