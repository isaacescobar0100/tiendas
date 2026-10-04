// SEO que necesita la base de datos (solo servidor).
import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Si la tienda no escribió «lo que vende», se arma con sus categorías que
 * tienen productos (las más surtidas primero; sin la de merch). Así una tienda
 * nueva sale en Google con títulos útiles desde el primer día.
 */
export async function withAutoKeywords<T extends { id: string; seoKeywords?: string | null; merchCategoryIds?: string[] }>(store: T): Promise<T> {
  if (store.seoKeywords?.trim()) return store;
  return { ...store, seoKeywords: await categoryKeywords(store.id, store.merchCategoryIds ?? []) };
}

export async function categoryKeywords(storeId: string, exclude: string[] = []): Promise<string | null> {
  const cats = await prisma.category.findMany({
    where: { storeId, products: { some: { active: true } } },
    orderBy: { products: { _count: "desc" } },
    select: { id: true, name: true },
    take: 10,
  });
  const names = cats.filter((c) => !exclude.includes(c.id)).map((c) => c.name);
  return names.length ? names.join(", ") : null;
}
