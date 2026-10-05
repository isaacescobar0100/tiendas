// Descuentos por porcentaje (Admin > Catálogo > Descuentos). Se aplican en UN
// solo lugar: cada página que muestra precios y el checkout (que cobra) pasan
// los productos por applyDiscounts, así lo que se ve es lo que se cobra.
import { prisma } from "@/lib/prisma";
import { discountedCents, isOnSale } from "@/lib/pricing";

export type DiscountRule = {
  id: string;
  percent: number;
  scope: string; // all | categories | products
  categoryIds: string[];
  productIds: string[];
};

/** Descuentos vigentes de la tienda (activos y dentro de sus fechas). */
export async function activeDiscounts(storeId: string): Promise<DiscountRule[]> {
  const now = new Date();
  return prisma.discount.findMany({
    where: {
      storeId,
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    select: { id: true, percent: true, scope: true, categoryIds: true, productIds: true },
  });
}

/** Mayor porcentaje que aplica a un producto (0 si ninguno). */
export function discountFor(
  p: { id: string; categoryId?: string | null },
  rules: DiscountRule[],
): number {
  let best = 0;
  for (const r of rules) {
    const hit =
      r.scope === "all" ||
      (r.scope === "categories" && !!p.categoryId && r.categoryIds.includes(p.categoryId)) ||
      (r.scope === "products" && r.productIds.includes(p.id));
    if (hit && r.percent > best) best = r.percent;
  }
  return Math.min(90, Math.max(0, best));
}

/**
 * Devuelve el producto con el descuento aplicado como precio de oferta
 * (salePriceCents). Si ya tenía una oferta manual más baja, se respeta.
 * Redondea a pesos enteros.
 */
export function applyDiscount<
  T extends { id: string; categoryId?: string | null; priceCents: number; salePriceCents?: number | null },
>(p: T, rules: DiscountRule[]): T {
  const pct = discountFor(p, rules);
  if (!pct) return p;
  const discounted = discountedCents(p.priceCents, pct);
  if (discounted <= 0 || discounted >= p.priceCents) return p;
  const current = isOnSale(p) ? (p.salePriceCents as number) : Infinity;
  return discounted < current ? { ...p, salePriceCents: discounted } : p;
}

export function applyDiscounts<
  T extends { id: string; categoryId?: string | null; priceCents: number; salePriceCents?: number | null },
>(products: T[], rules: DiscountRule[]): T[] {
  return rules.length ? products.map((p) => applyDiscount(p, rules)) : products;
}

/** Filtro de Prisma: productos alcanzados por algún descuento vigente. */
export function discountedWhere(rules: DiscountRule[]) {
  if (rules.some((r) => r.scope === "all")) return [{}];
  const productIds = rules.filter((r) => r.scope === "products").flatMap((r) => r.productIds);
  const categoryIds = rules.filter((r) => r.scope === "categories").flatMap((r) => r.categoryIds);
  const or: object[] = [];
  if (productIds.length) or.push({ id: { in: productIds } });
  if (categoryIds.length) or.push({ categoryId: { in: categoryIds } });
  return or;
}
