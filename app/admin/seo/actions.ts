"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

export type SeoState = { ok?: string; error?: string } | undefined;

const clean = (v: FormDataEntryValue | null, max: number) => {
  const t = String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return t || null;
};

/** Guarda los textos para Google (vacíos = se arman solos). */
export async function saveSeoAction(_prev: SeoState, formData: FormData): Promise<SeoState> {
  const { store } = await requireAdminStore();
  const keywords = clean(formData.get("seoKeywords"), 300)
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(", ") || null;
  await prisma.store.update({
    where: { id: store.id },
    data: {
      seoTitle: clean(formData.get("seoTitle"), 70),
      seoDescription: clean(formData.get("seoDescription"), 170),
      seoCity: clean(formData.get("seoCity"), 60),
      seoKeywords: keywords,
    },
  });
  revalidatePath("/admin/seo");
  revalidatePath(`/${store.slug}`, "layout");
  return { ok: "Guardado. Google lo verá en su próxima visita a tu tienda." };
}
