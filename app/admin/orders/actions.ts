"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import { sendStatusEmail } from "@/lib/email";

const paymentSchema = z.enum(["PENDING", "PAID", "CANCELLED"]);
const fulfillmentSchema = z.enum(["PENDING", "SHIPPED", "DELIVERED"]);
const emailKindSchema = z.enum(["shipped", "delivered"]);

export type NotifyState = { ok?: boolean; error?: string } | undefined;

/** Envía al cliente un correo de "va en camino" o "entregado". */
export async function notifyByEmailAction(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const kind = emailKindSchema.safeParse(formData.get("kind"));
  if (!kind.success) return { error: "Tipo inválido." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
  });
  if (!order) return { error: "Pedido no encontrado." };

  const ok = await sendStatusEmail({
    to: order.customerEmail,
    storeName: store.name,
    customerName: order.customerName,
    orderShortId: order.id.slice(-8),
    kind: kind.data,
    address: order.address,
    total: formatPrice(order.totalCents, order.currency),
  });
  return ok
    ? { ok: true }
    : { error: "No se pudo enviar (revisa la config de correo en Vercel)." };
}

/** Cambia el estado de PAGO del pedido (pendiente / pagado / cancelado). */
export async function updateOrderStatusAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = paymentSchema.safeParse(formData.get("status"));
  if (!parsed.success) return;

  // updateMany con el storeId garantiza que el admin solo toca sus pedidos
  await prisma.order.updateMany({
    where: { id: orderId, storeId: store.id },
    data: { status: parsed.data },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Cambia el estado de ENVÍO del pedido (por enviar / enviado / entregado). */
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
