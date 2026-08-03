"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type ReviewState = { error?: string; ok?: boolean } | undefined;

const schema = z.object({
  rating: z.coerce.number().int().min(1, "Elige de 1 a 5 estrellas.").max(5),
  comment: z.string().max(1000, "El comentario es muy largo.").optional(),
});

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const rl = rateLimit(`review:${await clientIp()}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Demasiadas reseñas. Inténtalo más tarde." };

  const storeSlug = String(formData.get("storeSlug") ?? "");
  const productId = String(formData.get("productId") ?? "");

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { id: true, slug: true },
  });
  if (!store) return { error: "Tienda no encontrada." };

  const customer = await getCurrentCustomer(store.id);
  if (!customer) {
    return { error: "Inicia sesión para dejar una reseña." };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id, active: true },
    select: { id: true, slug: true },
  });
  if (!product) return { error: "Producto no encontrado." };

  const parsed = schema.safeParse({
    rating: formData.get("rating"),
    comment: String(formData.get("comment") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Una reseña por cliente y producto: si ya existe, se actualiza.
  await prisma.review.upsert({
    where: {
      productId_customerId: { productId: product.id, customerId: customer.id },
    },
    create: {
      storeId: store.id,
      productId: product.id,
      customerId: customer.id,
      customerName: customer.name,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      customerName: customer.name,
    },
  });

  revalidatePath(`/${store.slug}/${product.slug}`);
  revalidatePath(`/${store.slug}`);
  return { ok: true };
}
