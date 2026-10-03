"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { sendStatusEmail } from "@/lib/email";
import { setOrderPaymentStatus, advanceFulfillment } from "@/lib/orders";
import { noticeText, NOTICE_STATE } from "@/lib/order-messages";

const paymentSchema = z.enum(["PENDING", "PAID", "CANCELLED"]);
const fulfillmentSchema = z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"]);
const noticeKindSchema = z.enum(["confirmed", "shipped"]);

export type NotifyState = { ok?: boolean; error?: string } | undefined;

function refresh(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}

/** Envía al cliente el correo de "pedido confirmado" o "va en camino". */
export async function notifyByEmailAction(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const kind = noticeKindSchema.safeParse(formData.get("kind"));
  if (!kind.success) return { error: "Tipo inválido." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
  });
  if (!order) return { error: "Pedido no encontrado." };
  if (order.status === "CANCELLED") return { error: "El pedido está cancelado." };

  const ok = await sendStatusEmail({
    to: order.customerEmail,
    storeName: store.name,
    brand: { name: store.name, color: store.themeColor, logoUrl: store.logoUrl },
    ...noticeText(kind.data, order, store.name),
  });
  if (!ok) {
    return { error: "No se pudo enviar (revisa la config de correo en Vercel)." };
  }
  await advanceFulfillment(
    { id: order.id, storeId: store.id },
    NOTICE_STATE[kind.data],
  );
  refresh(order.id);
  return { ok: true };
}

/** Se avisó por WhatsApp: el pedido avanza a "confirmado" / "en camino". */
export async function markNoticeSentAction(orderId: string, kind: string) {
  const { store } = await requireAdminStore();
  const parsed = noticeKindSchema.safeParse(kind);
  if (!parsed.success || typeof orderId !== "string") return;
  await advanceFulfillment(
    { id: orderId, storeId: store.id },
    NOTICE_STATE[parsed.data],
  );
  refresh(orderId);
}

/** Cambia el estado de PAGO del pedido (pendiente / pagado / cancelado). */
export async function updateOrderStatusAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = paymentSchema.safeParse(formData.get("status"));
  if (!parsed.success) return;

  // El storeId garantiza que el admin solo toca sus pedidos. Las reglas (no
  // reabrir cancelados, devolver stock al cancelar…) están en lib/orders.
  await setOrderPaymentStatus({ id: orderId, storeId: store.id }, parsed.data);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Cambia el estado de ATENCIÓN (por confirmar / confirmado / en camino / entregado). */
export async function updateFulfillmentAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = fulfillmentSchema.safeParse(formData.get("fulfillment"));
  if (!parsed.success) return;

  await prisma.order.updateMany({
    where: { id: orderId, storeId: store.id },
    data: { fulfillment: parsed.data },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
