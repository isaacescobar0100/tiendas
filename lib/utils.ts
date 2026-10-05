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

// Rutas propias de la app: una tienda no puede usar estos slugs (chocarían con
// /admin, /api, /login…). Solo el nombre exacto: el proxy compara la ruta
// completa ("/sede" o "/sede/…"), así que "sedeno" o "apicultura" sí sirven.
const RESERVED_SLUGS = new Set([
  "admin",
  "superadmin",
  "api",
  "login",
  "recuperar",
  "restablecer",
  "sede",
  "sitemap",
  "robots",
  "favicon",
  "_next",
]);

/** URL de imagen aceptable: http(s) o un archivo subido a /uploads. */
export function isSafeImageUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url) || /^\/uploads\/[\w.-]+$/.test(url);
}

/** URL de enlace aceptable: ruta interna ("/…", no "//…") o http(s). */
export function isSafeLinkUrl(url: string): boolean {
  return /^\/(?!\/)\S*$/.test(url) || /^https?:\/\/\S+$/i.test(url);
}

/** Encuadre de imagen "X% Y%"; cualquier otra cosa vuelve al centro. */
export function safePosition(p: unknown): string {
  return typeof p === "string" && /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(p)
    ? p
    : "50% 50%";
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

// Páginas propias de cada tienda (/menu, /sedes…): un producto con ese slug
// quedaría tapado por la página. Tampoco los de la plataforma (/login…), que
// en el subdominio de la tienda llevan al panel.
const STORE_PAGE_SLUGS = new Set([
  "cart",
  "checkout",
  "cuenta",
  "favorites",
  "legal",
  "menu",
  "nosotros",
  "rastrear",
  "sedes",
]);

export function isReservedProductSlug(slug: string): boolean {
  return STORE_PAGE_SLUGS.has(slug) || RESERVED_SLUGS.has(slug);
}

// Monedas sin decimales (el peso colombiano, entre otras): se muestran enteras.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "COP",
  "CLP",
  "JPY",
  "KRW",
  "PYG",
  "VND",
]);

// Pesos colombianos como se escriben en Colombia: $4.000 / $18.500.
const copFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Formatea un precio en céntimos a moneda legible. COP 400000 -> "$4.000" */
export function formatPrice(cents: number, currency = "COP"): string {
  if (currency === "COP") return "$" + copFormat.format(Math.round(cents / 100));
  const zeroDecimals = ZERO_DECIMAL_CURRENCIES.has(currency);
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
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
