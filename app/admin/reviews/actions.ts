"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { recalcProductRating } from "@/lib/reviews";

// El admin puede borrar una reseña de su tienda (moderación).
export async function deleteReviewAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id"));
  // Necesitamos el producto para recalcular su valoración tras borrar.
  const review = await prisma.review.findFirst({
    where: { id, storeId: store.id },
    select: { productId: true },
  });
  await prisma.review.deleteMany({ where: { id, storeId: store.id } });
  if (review) await recalcProductRating(review.productId);
  revalidatePath("/admin/reviews");
}
