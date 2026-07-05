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

  await sendOrderEmails({
    orderId: order.id,
    storeName: order.store.name,
    currency: order.currency,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    adminEmail: order.store.owner?.email,
    totalCents: order.totalCents,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
    })),
  });
  return true;
}
