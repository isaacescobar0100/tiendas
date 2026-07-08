"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { slugify, parsePriceToCents } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

const productSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto."),
  description: z.string().optional(),
  price: z.string().min(1, "Indica un precio."),
  salePrice: z.string().optional(),
  stock: z.string().optional(),
  imageUrl: z.string().url("URL de imagen inválida.").optional().or(z.literal("")),
  imagePosition: z.string().optional(),
  imageZoom: z.coerce.number().min(1).max(3).optional(),
  categoryId: z.string().optional(),
  active: z.string().optional(),
});

/** Genera un slug de producto único dentro de la tienda. */
async function uniqueProductSlug(
  storeId: string,
  name: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(name) || "producto";
  let slug = base;
  let n = 1;
  while (true) {
    const found = await prisma.product.findUnique({
      where: { storeId_slug: { storeId, slug } },
    });
    if (!found || found.id === ignoreId) break;
    slug = `${base}-${n++}`;
  }
  return slug;
}

function readProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    salePrice: formData.get("salePrice") ?? "",
    stock: formData.get("stock") ?? "0",
    imageUrl: formData.get("imageUrl") ?? "",
    imagePosition: formData.get("imagePosition") ?? "50% 50%",
    imageZoom: formData.get("imageZoom") ?? "1",
    categoryId: formData.get("categoryId") ?? "",
    active: formData.get("active") ?? "",
  });
}

/** Lee la galería (JSON [{url, position, zoom}]) del formulario. */
function readGallery(formData: FormData): {
  galleryData: string;
  images: string[];
} {
  try {
    const raw = JSON.parse(String(formData.get("gallery") ?? "[]"));
    if (Array.isArray(raw)) {
      const items = raw
        .map((i) => ({
          url: String(i?.url ?? ""),
          position: typeof i?.position === "string" ? i.position : "50% 50%",
          zoom: Math.max(1, Math.min(3, Number(i?.zoom) || 1)),
        }))
        .filter((i) => i.url.length > 0);
      return {
        galleryData: JSON.stringify(items),
        images: items.map((i) => i.url),
      };
    }
  } catch {
    // cae al valor vacío
  }
  return { galleryData: "[]", images: [] };
}

type VariantInput = { color: string; size: string; stock: number };

/** Lee las variantes (color + talla) del formulario, limpiando y deduplicando. */
function readVariants(formData: FormData): VariantInput[] {
  try {
    const raw = JSON.parse(String(formData.get("variants") ?? "[]"));
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: VariantInput[] = [];
    for (const v of raw) {
      const color = String(v?.color ?? "").trim();
      const size = String(v?.size ?? "").trim();
      // al menos una dimensión debe existir
      if (!color && !size) continue;
      const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        color,
        size,
        stock: Math.max(0, Math.floor(Number(v?.stock) || 0)),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Sincroniza las variantes de un producto (borra y recrea). */
async function syncVariants(productId: string, variants: VariantInput[]) {
  await prisma.productVariant.deleteMany({ where: { productId } });
  if (variants.length > 0) {
    await prisma.productVariant.createMany({
      data: variants.map((v) => ({
        productId,
        color: v.color,
        size: v.size,
        stock: v.stock,
      })),
    });
  }
}

/**
 * Resuelve el precio de oferta (en céntimos) a partir del texto del formulario.
 * Devuelve null si no hay oferta; error si es inválido o no es menor al normal.
 */
function resolveSalePrice(
  raw: string | undefined,
  priceCents: number,
): { value: number | null; error?: string } {
  const s = (raw ?? "").trim();
  if (!s) return { value: null };
  const c = parsePriceToCents(s);
  if (c === null) return { value: null, error: "Precio de oferta inválido." };
  if (c <= 0) return { value: null };
  if (c >= priceCents) {
    return {
      value: null,
      error: "El precio de oferta debe ser menor que el precio normal.",
    };
  }
  return { value: c };
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { store } = await requireAdminStore();

  const parsed = readProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const priceCents = parsePriceToCents(parsed.data.price);
  if (priceCents === null) return { error: "Precio inválido." };

  const sale = resolveSalePrice(parsed.data.salePrice, priceCents);
  if (sale.error) return { error: sale.error };

  const slug = await uniqueProductSlug(store.id, parsed.data.name);
  const gallery = readGallery(formData);

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      priceCents,
      salePriceCents: sale.value,
      stock: Number(parsed.data.stock) || 0,
      imageUrl: parsed.data.imageUrl || null,
      imagePosition: parsed.data.imagePosition || "50% 50%",
      imageZoom: parsed.data.imageZoom ?? 1,
      images: gallery.images,
      galleryData: gallery.galleryData,
      categoryId: parsed.data.categoryId || null,
      active: parsed.data.active === "on",
    },
  });
  await syncVariants(product.id, readVariants(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id"));

  const existing = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });
  if (!existing) return { error: "Producto no encontrado." };

  const parsed = readProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const priceCents = parsePriceToCents(parsed.data.price);
  if (priceCents === null) return { error: "Precio inválido." };

  const sale = resolveSalePrice(parsed.data.salePrice, priceCents);
  if (sale.error) return { error: sale.error };

  const slug = await uniqueProductSlug(store.id, parsed.data.name, id);
  const gallery = readGallery(formData);

  await prisma.product.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      priceCents,
      salePriceCents: sale.value,
      stock: Number(parsed.data.stock) || 0,
      imageUrl: parsed.data.imageUrl || null,
      imagePosition: parsed.data.imagePosition || "50% 50%",
      imageZoom: parsed.data.imageZoom ?? 1,
      images: gallery.images,
      galleryData: gallery.galleryData,
      categoryId: parsed.data.categoryId || null,
      active: parsed.data.active === "on",
    },
  });
  await syncVariants(id, readVariants(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id"));
  await prisma.product.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

export async function createCategoryAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;

  const slug = slugify(name) || "categoria";
  await prisma.category
    .create({ data: { storeId: store.id, name, slug } })
    .catch(() => {}); // ignora duplicados por slug
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products/new");
}

export async function deleteCategoryAction(formData: FormData) {
  const { store } = await requireAdminStore();
  const id = String(formData.get("id"));
  await prisma.category.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/categories");
}
