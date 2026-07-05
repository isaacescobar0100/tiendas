// Utilidades compartidas

/** Convierte un texto a slug URL-safe: "Mi Tienda!" -> "mi-tienda" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Formatea un precio en céntimos a moneda legible. 1999 -> "$19.99" */
export function formatPrice(cents: number, currency = "COP"): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Etiqueta legible de una variante: "Negro · M", "M", "Negro" o "". */
export function variantLabel(
  color?: string | null,
  size?: string | null,
): string {
  return [color, size].filter(Boolean).join(" · ");
}

/** Convierte un string "19.99" a céntimos (1999). Devuelve null si es inválido. */
export function parsePriceToCents(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}
