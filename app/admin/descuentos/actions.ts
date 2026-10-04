"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";

export type DiscountState = { ok?: string; error?: string } | undefined;

// "2026-10-04T18:00" (hora de Colombia, del campo datetime-local) → Date.
function bogota(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Crea o actualiza un descuento por porcentaje. */
export async function saveDiscountAction(
  _prev: DiscountState,
  formData: FormData,
): Promise<DiscountState> {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const percent = Math.round(Number(formData.get("percent")));
  const scope = String(formData.get("scope") ?? "");

  if (!name) return { error: "Ponle un nombre al descuento (p. ej. \"Martes de hamburguesas\")." };
  if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
    return { error: "El porcentaje debe estar entre 1 y 90." };
  }
  if (!["all", "categories", "products"].includes(scope)) return { error: "Elige a qué se aplica." };

  // Solo categorías y productos que son DE ESTA tienda.
  const [cats, prods] = await Promise.all([
    prisma.category.findMany({ where: { storeId: store.id }, select: { id: true } }),
    prisma.product.findMany({ where: { storeId: store.id }, select: { id: true } }),
  ]);
  const okCat = new Set(cats.map((c) => c.id));
  const okProd = new Set(prods.map((p) => p.id));
  const categoryIds = scope === "categories" ? [...new Set(formData.getAll("categoryIds").map(String))].filter((x) => okCat.has(x)) : [];
  const productIds = scope === "products" ? [...new Set(formData.getAll("productIds").map(String))].filter((x) => okProd.has(x)) : [];
  if (scope === "categories" && !categoryIds.length) return { error: "Marca al menos una categoría." };
  if (scope === "products" && !productIds.length) return { error: "Marca al menos un producto." };

  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const endsRaw = String(formData.get("endsAt") ?? "").trim();
  const startsAt = startsRaw ? bogota(startsRaw) : null;
  const endsAt = endsRaw ? bogota(endsRaw) : null;
  if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) return { error: "Fecha inválida." };
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "La fecha de fin debe ser después del inicio." };

  const data = {
    name,
    percent,
    scope,
    categoryIds,
    productIds,
    startsAt,
    endsAt,
    active: formData.get("active") === "on",
  };
  if (id) {
    const r = await prisma.discount.updateMany({ where: { id, storeId: store.id }, data });
    if (!r.count) return { error: "Descuento no encontrado." };
  } else {
    await prisma.discount.create({ data: { ...data, storeId: store.id } });
  }
  revalidatePath("/admin/descuentos");
  revalidatePath(`/${store.slug}`, "layout");
  return { ok: id ? "Descuento actualizado." : "Descuento creado. Ya se ve en tu tienda." };
}

export async function deleteDiscountAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id") ?? "");
  await prisma.discount.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/descuentos");
  revalidatePath(`/${store.slug}`, "layout");
}
