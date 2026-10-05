// ─── Tema por tienda ──────────────────────────────────────────────────────────
// Cada tienda guarda solo 5 colores + modo + tipografía. Todo lo demás (hover,
// bordes, textos atenuados, versiones suaves, texto sobre la marca, colores de
// estado) se DERIVA aquí, con protecciones de contraste (WCAG AA) y de
// saturación. Puro TypeScript: lo usan el servidor (al pintar la tienda y al
// guardar) y el navegador (vista previa del editor), con el mismo resultado.

export type ThemeMode = "light" | "dark";
export type FontKey = "moderna" | "elegante" | "amigable" | "urbana";

export type ThemeInput = {
  brand: string;
  bg: string;
  surface: string;
  ink: string;
  mode: ThemeMode;
  font: FontKey;
};

export const DEFAULT_THEME: ThemeInput = {
  brand: "#111827",
  bg: "#ffffff",
  surface: "#ffffff",
  ink: "#111827",
  mode: "light",
  font: "moderna",
};

/** Paletas de partida del editor. */
export const THEME_PRESETS: { key: string; name: string; theme: Omit<ThemeInput, "font"> }[] = [
  { key: "clasico", name: "Clásico", theme: { brand: "#111827", bg: "#ffffff", surface: "#ffffff", ink: "#111827", mode: "light" } },
  { key: "calido", name: "Cálido", theme: { brand: "#b4532a", bg: "#faf6f1", surface: "#ffffff", ink: "#2b2118", mode: "light" } },
  { key: "bosque", name: "Bosque", theme: { brand: "#2f6b4f", bg: "#f5f8f4", surface: "#ffffff", ink: "#1b2a22", mode: "light" } },
  { key: "oceano", name: "Océano", theme: { brand: "#1f5fbf", bg: "#f4f7fb", surface: "#ffffff", ink: "#0f1b2d", mode: "light" } },
  { key: "vino", name: "Vino", theme: { brand: "#8a2342", bg: "#fbf6f7", surface: "#ffffff", ink: "#2a1219", mode: "light" } },
  { key: "noche", name: "Noche", theme: { brand: "#f0a33a", bg: "#101215", surface: "#1a1d22", ink: "#f2f3f5", mode: "dark" } },
  { key: "grafito", name: "Grafito", theme: { brand: "#5ccf8f", bg: "#121313", surface: "#1d1f1f", ink: "#ececec", mode: "dark" } },
  { key: "medianoche", name: "Medianoche", theme: { brand: "#6fa8f5", bg: "#0b1220", surface: "#141d2f", ink: "#e6edf7", mode: "dark" } },
];

/** Combinaciones tipográficas curadas (títulos / texto). Las fuentes las carga lib/fonts.ts. */
export const FONT_PAIRS: Record<FontKey, { name: string; heading: string; body: string }> = {
  moderna: { name: "Moderna", heading: "var(--font-geist-sans)", body: "var(--font-geist-sans)" },
  elegante: { name: "Elegante", heading: "var(--font-playfair)", body: "var(--font-inter)" },
  amigable: { name: "Amigable", heading: "var(--font-poppins)", body: "var(--font-nunito)" },
  urbana: { name: "Urbana", heading: "var(--font-space-grotesk)", body: "var(--font-inter)" },
};

// ─── Matemática de color ─────────────────────────────────────────────────────

type RGB = [number, number, number]; // 0..1
type Lab = [number, number, number]; // OKLab

const HEX = /^#([0-9a-f]{6})$/i;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

function toRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function toHex([r, g, b]: RGB): string {
  const c = (x: number) =>
    Math.round(Math.min(1, Math.max(0, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** Luminancia relativa (WCAG). */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toLab(hex: string): Lab {
  const [r, g, b] = toRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromLab([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([
    unlin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    unlin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    unlin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]);
}

/** Mezcla perceptual (OKLab): t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const A = toLab(a);
  const B = toLab(b);
  return fromLab([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Limita la saturación (croma OKLCH) para evitar colores neón. */
export function clampChroma(hex: string, max: number): string {
  const [L, a, b] = toLab(hex);
  const C = Math.hypot(a, b);
  if (C <= max) return hex.toLowerCase();
  const k = max / C;
  return fromLab([L, a * k, b * k]);
}

/** Cambia la luminosidad (OKLab L) en `delta`, sin tocar el tono. */
function shiftL(hex: string, delta: number): string {
  const [L, a, b] = toLab(hex);
  return fromLab([Math.min(1, Math.max(0, L + delta)), a, b]);
}

/** Blanco o negro: el que más contraste tenga sobre `bg`. */
export function readableOn(bg: string): string {
  return contrast("#ffffff", bg) >= contrast("#111111", bg) ? "#ffffff" : "#111111";
}

/**
 * Oscurece o aclara `fg` (en la dirección que se aleja de los fondos) hasta
 * alcanzar `min` de contraste contra TODOS los fondos dados.
 */
export function ensureContrast(fg: string, bgs: string[], min: number): string {
  const worst = (c: string) => Math.min(...bgs.map((b) => contrast(c, b)));
  if (worst(fg) >= min) return fg;
  const darker = bgs.reduce((n, b) => n + luminance(b), 0) / bgs.length > 0.18;
  let c = fg;
  for (let i = 0; i < 40 && worst(c) < min; i++) c = shiftL(c, darker ? -0.025 : 0.025);
  return c;
}

// ─── Normalización y validación ──────────────────────────────────────────────

// Topes de saturación (croma OKLCH): marca viva pero no neón; fondos y texto
// casi neutros para que se lea bien cualquier combinación.
const MAX_CHROMA = { brand: 0.17, bg: 0.035, surface: 0.035, ink: 0.06 };

const FONT_KEYS = Object.keys(FONT_PAIRS) as FontKey[];

/** Datos crudos (formulario, BD) → tema válido con saturación limitada. */
export function normalizeTheme(raw: Partial<Record<keyof ThemeInput, unknown>>): ThemeInput {
  const pick = (k: "brand" | "bg" | "surface" | "ink") =>
    clampChroma(isHex(raw[k]) ? (raw[k] as string).toLowerCase() : DEFAULT_THEME[k], MAX_CHROMA[k]);
  return {
    brand: pick("brand"),
    bg: pick("bg"),
    surface: pick("surface"),
    ink: pick("ink"),
    mode: raw.mode === "dark" ? "dark" : "light",
    font: FONT_KEYS.includes(raw.font as FontKey) ? (raw.font as FontKey) : DEFAULT_THEME.font,
  };
}

export type ThemeCheck = {
  key: string;
  label: string;
  ratio: number;
  min: number;
  ok: boolean;
};

/** Comprobaciones de contraste que muestra el editor y exige el servidor. */
export function checkTheme(t: ThemeInput): ThemeCheck[] {
  const brandInk = readableOn(t.brand);
  const rows: Omit<ThemeCheck, "ok">[] = [
    { key: "ink-bg", label: "Texto sobre el fondo", ratio: contrast(t.ink, t.bg), min: 4.5 },
    { key: "ink-surface", label: "Texto sobre tarjetas", ratio: contrast(t.ink, t.surface), min: 4.5 },
    { key: "brand-ink", label: "Texto de los botones", ratio: contrast(brandInk, t.brand), min: 4.5 },
    { key: "brand-bg", label: "Botones sobre el fondo", ratio: contrast(t.brand, t.bg), min: 3 },
  ];
  return rows.map((r) => ({ ...r, ratio: Math.round(r.ratio * 100) / 100, ok: r.ratio >= r.min }));
}

/** ¿El modo coincide con el fondo? (aviso, no bloquea). */
export function modeMismatch(t: ThemeInput): boolean {
  const dark = luminance(t.bg) < 0.2;
  return (t.mode === "dark") !== dark;
}

/** Marca válida: se distingue del fondo (3:1) y admite texto legible (4.5:1). */
function fixBrand(brand: string, bg: string): string {
  const good = (c: string) => contrast(c, bg) >= 3 && contrast(readableOn(c), c) >= 4.5;
  if (good(brand)) return brand;
  // El mismo tono, lo más cerca posible del original: más oscuro o más claro.
  for (let i = 1; i <= 50; i++) {
    for (const d of [-1, 1]) {
      const c = clampChroma(shiftL(brand, d * 0.015 * i), MAX_CHROMA.brand);
      if (good(c)) return c;
    }
  }
  return luminance(bg) > 0.18 ? "#111827" : "#f2f3f5";
}

/** Ajusta lo mínimo para que el tema pase todas las comprobaciones. */
export function autoFixTheme(input: ThemeInput): ThemeInput {
  const t = normalizeTheme(input);
  return {
    ...t,
    ink: ensureContrast(t.ink, [t.bg, t.surface], 4.5),
    brand: fixBrand(t.brand, t.bg),
    mode: luminance(t.bg) < 0.2 ? "dark" : "light",
  };
}

// ─── Tokens derivados ────────────────────────────────────────────────────────

// Colores de estado fijos y apagados (no dependen de la marca).
const SEMANTIC = { ok: "#2f7d55", warn: "#a86b12", bad: "#b83a3a", info: "#2f64a8", alt: "#6b4fa8" };

/** Todas las variables CSS del tema (se inyectan en el contenedor raíz). */
export function themeTokens(input: ThemeInput): Record<string, string> {
  const t = normalizeTheme(input);
  const { bg, surface, ink, brand } = t;
  const dark = t.mode === "dark";
  const surface2 = mix(surface, ink, dark ? 0.06 : 0.035);
  const surface3 = mix(surface, ink, dark ? 0.11 : 0.07);
  // El texto puede ir sobre el fondo, las tarjetas o las píldoras grises:
  // los atenuados cumplen AA sobre todos ellos.
  const textBgs = [bg, surface, surface2, surface3];

  const tokens: Record<string, string> = {
    "--bg": bg,
    "--surface": surface,
    "--surface-2": surface2,
    "--surface-3": surface3,
    "--ink": ink,
    // Textos atenuados: siempre AA (4.5:1) sobre fondo y tarjetas.
    "--ink-2": ensureContrast(mix(ink, bg, 0.22), textBgs, 4.5),
    "--ink-3": ensureContrast(mix(ink, bg, 0.38), textBgs, 4.5),
    // Decorativo (iconos, separadores, placeholders): 3:1.
    "--ink-4": ensureContrast(mix(ink, bg, 0.55), textBgs, 3),
    "--line": mix(surface, ink, dark ? 0.16 : 0.11),
    "--line-2": mix(surface, ink, dark ? 0.26 : 0.2),
    "--brand": brand,
    "--brand-ink": readableOn(brand),
    "--brand-hover": shiftL(brand, dark || luminance(brand) < 0.06 ? 0.06 : -0.06),
    "--brand-soft": mix(bg, brand, dark ? 0.2 : 0.12),
    // La marca como TEXTO (enlaces, etiquetas) sobre el fondo: AA garantizado.
    "--brand-text": ensureContrast(brand, textBgs, 4.5),
    "--font-heading-family": FONT_PAIRS[t.font].heading,
    "--font-body-family": FONT_PAIRS[t.font].body,
  };
  for (const [k, base] of Object.entries(SEMANTIC)) {
    const soft = mix(bg, base, dark ? 0.24 : 0.12);
    tokens[`--${k}`] = base;
    tokens[`--${k}-soft`] = soft;
    tokens[`--${k}-ink`] = ensureContrast(dark ? mix(base, "#ffffff", 0.45) : base, [soft, bg, surface], 4.5);
  }
  tokens["--brand-text"] = ensureContrast(tokens["--brand-text"], [tokens["--brand-soft"]], 4.5);
  return tokens;
}

/** Estilo inline del contenedor de la tienda (sin parpadeo: llega con el HTML). */
export function themeStyle(input: ThemeInput): React.CSSProperties {
  return {
    ...(themeTokens(input) as React.CSSProperties),
    colorScheme: input.mode === "dark" ? "dark" : "light",
  };
}

/** Tema guardado en la tienda (columnas de la BD) → ThemeInput. */
export function storeTheme(store: {
  themeColor: string;
  themeBg: string;
  themeSurface: string;
  themeInk: string;
  themeMode: string;
  themeFont: string;
}): ThemeInput {
  return normalizeTheme({
    brand: store.themeColor,
    bg: store.themeBg,
    surface: store.themeSurface,
    ink: store.themeInk,
    mode: store.themeMode as ThemeMode,
    font: store.themeFont as FontKey,
  });
}
