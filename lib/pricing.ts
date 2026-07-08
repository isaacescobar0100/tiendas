// Precio efectivo de un producto teniendo en cuenta la oferta.
// Una oferta es válida solo si es mayor que 0 y menor que el precio normal.

export type Priced = { priceCents: number; salePriceCents?: number | null };

export function isOnSale(p: Priced): boolean {
  return (
    p.salePriceCents != null &&
    p.salePriceCents > 0 &&
    p.salePriceCents < p.priceCents
  );
}

/** Precio que se cobra: el de oferta si es válido, si no el normal. */
export function effectivePriceCents(p: Priced): number {
  return isOnSale(p) ? (p.salePriceCents as number) : p.priceCents;
}

/** Porcentaje de descuento redondeado (0 si no hay oferta). */
export function discountPercent(p: Priced): number {
  if (!isOnSale(p)) return 0;
  return Math.round((1 - (p.salePriceCents as number) / p.priceCents) * 100);
}
