"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

// Lee y normaliza los campos comunes de una promoción del formulario.
function readForm(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length > 0 ? v : null;
  };
  return {
    imageUrl: str("imageUrl"),
    title: str("title"),
    subtitle: str("subtitle"),
    linkUrl: str("linkUrl"),
    active: formData.get("active") === "on",
    sortOrder: Math.floor(Number(formData.get("sortOrder")) || 0),
    // Destinos elegidos con casillas
    showOnBanner: formData.get("showOnBanner") === "on",
    showOnOffers: formData.get("showOnOffers") === "on",
    categoryId: str("categoryId"),
  };
}

/** Devuelve el categoryId solo si pertenece a la tienda; si no, null. */
async function normalizeCategory(
  storeId: string,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const c = await prisma.category.findFirst({
    where: { id: categoryId, storeId },
    select: { id: true },
  });
  return c ? c.id : null;
}

export async function createPromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const data = readForm(formData);
  // Al menos algo de contenido (imagen o texto).
  if (!data.imageUrl && !data.title && !data.subtitle) return;

  const categoryId = await normalizeCategory(store.id, data.categoryId);
  await prisma.promotion.create({
    data: { storeId: store.id, ...data, categoryId },
  });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`);
}

export async function updatePromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);

  const categoryId = await normalizeCategory(store.id, data.categoryId);
  await prisma.promotion.updateMany({
    where: { id, storeId: store.id },
    data: { ...data, categoryId },
  });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`);
}

export async function deletePromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  await prisma.promotion.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`);
}
