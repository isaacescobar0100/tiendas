"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

// El admin puede borrar una reseña de su tienda (moderación).
export async function deleteReviewAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id"));
  await prisma.review.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/reviews");
}
