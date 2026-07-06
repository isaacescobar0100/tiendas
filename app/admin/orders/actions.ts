"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

const paymentSchema = z.enum(["PENDING", "PAID", "CANCELLED"]);
const fulfillmentSchema = z.enum(["PENDING", "SHIPPED", "DELIVERED"]);

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
