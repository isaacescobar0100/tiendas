"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { isSafeImageUrl, isSafeLinkUrl, safePosition } from "@/lib/utils";
import { parseCoverVideo } from "@/lib/video";

// Lee y normaliza los campos comunes de una promoción del formulario.
function readForm(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v.length > 0 ? v : null;
  };
  // URLs: solo imágenes http(s)//uploads y enlaces internos o http(s).
  const imageUrl = str("imageUrl");
  const linkUrl = str("linkUrl");
  const videoUrl = str("videoUrl");
  return {
    // Video de la diapositiva (subido, YouTube o Vimeo); validado igual que la portada.
    videoUrl: videoUrl && parseCoverVideo(videoUrl) ? videoUrl : null,
    imageUrl: imageUrl && isSafeImageUrl(imageUrl) ? imageUrl : null,
    imagePosition: safePosition(String(formData.get("imagePosition") ?? "").trim()),
    imageZoom: Math.max(1, Math.min(3, Number(formData.get("imageZoom")) || 1)),
    title: str("title")?.slice(0, 120) ?? null,
    subtitle: str("subtitle")?.slice(0, 200) ?? null,
    linkUrl: linkUrl && isSafeLinkUrl(linkUrl) ? linkUrl : null,
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

export type PromoState = { ok?: string; error?: string } | undefined;

export async function createPromotionAction(
  _prev: PromoState,
  formData: FormData,
): Promise<PromoState> {
  const { store } = await requireAdminStore();
  const data = readForm(formData);
  // Al menos algo de contenido (imagen, video o texto) — y se dice qué falta.
  if (!data.imageUrl && !data.videoUrl && !data.title && !data.subtitle) {
    return { error: "Sube una imagen o un video, o escribe al menos un título." };
  }

  const categoryId = await normalizeCategory(store.id, data.categoryId);
  await prisma.promotion.create({
    data: { storeId: store.id, ...data, categoryId },
  });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`, "layout");
  return { ok: "Promoción creada. Ya está en tu tienda." };
}

export async function updatePromotionAction(
  _prev: PromoState,
  formData: FormData,
): Promise<PromoState> {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!data.imageUrl && !data.videoUrl && !data.title && !data.subtitle) {
    return { error: "La promoción necesita una imagen, un video o un título." };
  }

  const categoryId = await normalizeCategory(store.id, data.categoryId);
  const r = await prisma.promotion.updateMany({
    where: { id, storeId: store.id },
    data: { ...data, categoryId },
  });
  if (!r.count) return { error: "Promoción no encontrada." };
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`, "layout");
  return { ok: "Cambios guardados." };
}

export async function deletePromotionAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  await prisma.promotion.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/promotions");
  revalidatePath(`/${store.slug}`);
}
