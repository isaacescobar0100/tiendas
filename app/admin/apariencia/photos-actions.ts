"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { parseStorePhotos, photoFromForm } from "@/lib/store-photos";

export type PhotosState = { ok?: boolean; error?: string } | undefined;

/**
 * Guarda las fotos de la tienda: fondo de la portada del menú QR, fondo del
 * acceso (login) y la galería del negocio. El servidor vuelve a validarlas.
 */
export async function savePhotosAction(
  _prev: PhotosState,
  formData: FormData,
): Promise<PhotosState> {
  const { store } = await requireAdminStore();
  const menuBg = photoFromForm(formData, "menuBg");
  const loginBg = photoFromForm(formData, "loginBg");
  const photos = parseStorePhotos(String(formData.get("photos") ?? "[]"));
  await prisma.store.update({
    where: { id: store.id },
    data: {
      menuBgJson: menuBg ? JSON.stringify(menuBg) : "",
      loginBgJson: loginBg ? JSON.stringify(loginBg) : "",
      photosJson: JSON.stringify(photos),
    },
  });
  revalidatePath(`/${store.slug}`, "layout");
  revalidatePath("/admin/apariencia");
  return { ok: true };
}
