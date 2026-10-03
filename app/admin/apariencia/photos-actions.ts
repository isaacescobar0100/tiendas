"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { parseStorePhotos } from "@/lib/store-photos";

export type PhotosState = { ok?: boolean; error?: string } | undefined;

/** Guarda las fotos del negocio (el servidor vuelve a validarlas). */
export async function savePhotosAction(
  _prev: PhotosState,
  formData: FormData,
): Promise<PhotosState> {
  const { store } = await requireAdminStore();
  const photos = parseStorePhotos(String(formData.get("photos") ?? "[]"));
  await prisma.store.update({
    where: { id: store.id },
    data: { photosJson: JSON.stringify(photos) },
  });
  revalidatePath(`/${store.slug}`, "layout");
  revalidatePath("/admin/apariencia");
  return { ok: true };
}
