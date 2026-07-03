"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

const statusSchema = z.enum(["PENDING", "PAID", "SHIPPED", "CANCELLED"]);

export async function updateOrderStatusAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return;

  // updateMany con el storeId garantiza que el admin solo toca sus pedidos
  await prisma.order.updateMany({
    where: { id: orderId, storeId: store.id },
    data: { status: parsed.data },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
