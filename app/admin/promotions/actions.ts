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
  };
}

export async function createPromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const data = readForm(formData);
  // Al menos algo de contenido (imagen o texto).
  if (!data.imageUrl && !data.title && !data.subtitle) return;

  await prisma.promotion.create({ data: { storeId: store.id, ...data } });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`);
}

export async function updatePromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);

  await prisma.promotion.updateMany({
    where: { id, storeId: store.id },
    data,
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
