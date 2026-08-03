import { prisma } from "@/lib/prisma";

export type Rating = { avg: number; count: number };

// Promedio y número de reseñas por producto de una tienda (para las tarjetas).
export async function getStoreRatings(
  storeId: string,
): Promise<Map<string, Rating>> {
  const rows = await prisma.review.groupBy({
    by: ["productId"],
    where: { storeId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    rows.map((r) => [
      r.productId,
      { avg: r._avg.rating ?? 0, count: r._count.rating },
    ]),
  );
}

// Promedio y número de reseñas de un solo producto.
export async function getProductRating(productId: string): Promise<Rating> {
  const r = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: r._avg.rating ?? 0, count: r._count.rating };
}
