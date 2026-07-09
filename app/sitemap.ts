import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/site-url";

// Se regenera cada hora (nuevos productos/tiendas aparecen sin redesplegar).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const stores = await prisma.store.findMany({
    where: { active: true },
    select: {
      slug: true,
      updatedAt: true,
      products: {
        where: { active: true },
        select: { slug: true, updatedAt: true },
      },
    },
  });

  // No incluimos la raíz (lista de todas las tiendas): es interna y va noindex.
  const entries: MetadataRoute.Sitemap = [];

  for (const store of stores) {
    entries.push({
      url: `${base}/${store.slug}`,
      lastModified: store.updatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    });
    for (const p of store.products) {
      entries.push({
        url: `${base}/${store.slug}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
