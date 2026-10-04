"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { sanitizeAbout } from "@/lib/about";

export type AboutState = { ok?: string; error?: string } | undefined;

/** Guarda la página "Conócenos". Todo se limpia en el servidor (lib/about). */
export async function saveAboutAction(json: string): Promise<AboutState> {
  const { store } = await requireAdminStore();
  if (json.length > 50_000) return { error: "El contenido es demasiado largo." };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: "No se pudo leer el formulario. Recarga la página." };
  }
  const about = sanitizeAbout(raw);
  if (about.enabled && !about.story && !about.mission && !about.vision) {
    return {
      error: "Para publicar la página escribe al menos «Quiénes somos», la misión o la visión.",
    };
  }
  await prisma.store.update({
    where: { id: store.id },
    data: { aboutJson: JSON.stringify(about) },
  });
  revalidatePath("/admin/nosotros");
  revalidatePath(`/${store.slug}`, "layout");
  return {
    ok: about.enabled
      ? "Guardado. La página ya está publicada en tu tienda."
      : "Guardado. La página está oculta (actívala para publicarla).",
  };
}
