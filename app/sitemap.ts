import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { storeForHost } from "@/lib/host-store";
import { storeUrl, sedeSlug } from "@/lib/seo";
import { aboutIsLive, parseAbout } from "@/lib/about";

// Dinámico: cada tienda publica SU sitemap en su propia dirección
// (subdominio o dominio propio). La plataforma no se indexa.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await storeForHost();
  if (!store) return [];

  const [products, locations] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, active: true },
      select: { slug: true, updatedAt: true, imageUrl: true },
    }),
    prisma.storeLocation.findMany({ where: { storeId: store.id }, select: { name: true } }),
  ]);

  const u = (path = "") => storeUrl(store, path);
  const entries: MetadataRoute.Sitemap = [
    { url: u(), lastModified: store.updatedAt, changeFrequency: "daily", priority: 1 },
  ];
  if (store.type === "FOOD") {
    entries.push({ url: u("/menu"), lastModified: store.updatedAt, changeFrequency: "daily", priority: 0.9 });
  }
  if (aboutIsLive(parseAbout(store.aboutJson))) {
    entries.push({ url: u("/nosotros"), lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.7 });
  }
  if (locations.length) {
    entries.push({ url: u("/sedes"), lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.8 });
    for (const l of locations) {
      entries.push({ url: u(`/sedes/${sedeSlug(l.name)}`), lastModified: store.updatedAt, changeFrequency: "monthly", priority: 0.8 });
    }
  }
  for (const p of products) {
    entries.push({
      url: u(`/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
      images: p.imageUrl ? [p.imageUrl] : undefined,
    });
  }
  for (const doc of ["terminos", "privacidad"]) {
    entries.push({ url: u(`/legal/${doc}`), changeFrequency: "yearly", priority: 0.2 });
  }
  return entries;
}
