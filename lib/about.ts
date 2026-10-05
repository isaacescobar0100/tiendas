import { parseCoverVideo } from "@/lib/video";
import { safePosition } from "@/lib/utils";
import type { StorePhoto } from "@/lib/store-photos";

// Página "Conócenos" de la tienda (Admin > Mi tienda > Página Conócenos).
// Se guarda en Store.aboutJson. Todo es texto del admin: se limpia y se
// recorta al leer y al guardar, así la página nunca recibe algo inesperado.

export type AboutValue = { title: string; text: string };
export type AboutPhone = { label: string; number: string };
export type AboutEmail = { label: string; email: string };
export type AboutFaq = { q: string; a: string };
export type AboutHighlight = { value: string; label: string };
// Foto o video de la galería (video: subido, YouTube o Vimeo).
export type AboutMedia = { kind: "image" | "video"; url: string; caption: string };
// Foto junto a "Quiénes somos", con su encuadre (posición y zoom).
export type AboutPhoto = StorePhoto;
export type AboutSocials = {
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
};

export type StoreAbout = {
  enabled: boolean;
  ctaLabel: string; // botón en la portada de la tienda
  headline: string; // "Bienvenidos a …"
  intro: string; // frase corta bajo el título
  story: string; // quiénes somos
  highlights: AboutHighlight[]; // datos destacados ("3 sedes", "+10 años")
  gallery: AboutMedia[];
  storyPhoto: AboutPhoto | null; // vacía = la primera foto de la galería
  mission: string;
  vision: string;
  values: AboutValue[];
  phones: AboutPhone[];
  emails: AboutEmail[];
  socials: AboutSocials;
  faqs: AboutFaq[];
};

export const ABOUT_LIMITS = {
  ctaLabel: 30,
  headline: 80,
  intro: 200,
  story: 2000,
  highlights: 4,
  highlightValue: 14,
  highlightLabel: 40,
  gallery: 40,
  caption: 120,
  mission: 800,
  vision: 800,
  values: 6,
  valueTitle: 40,
  valueText: 200,
  phones: 6,
  emails: 4,
  label: 40,
  faqs: 10,
  faqQ: 150,
  faqA: 800,
} as const;

export const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube", "website"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export function emptyAbout(): StoreAbout {
  return {
    enabled: false,
    ctaLabel: "Conócenos",
    headline: "",
    intro: "",
    story: "",
    highlights: [],
    gallery: [],
    storyPhoto: null,
    mission: "",
    vision: "",
    values: [],
    phones: [],
    emails: [],
    socials: { instagram: "", facebook: "", tiktok: "", youtube: "", website: "" },
    faqs: [],
  };
}

// Texto de una línea (sin saltos ni caracteres de control).
function line(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Texto con párrafos: conserva saltos de línea (máx. dos seguidos).
function text(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function list<T>(v: unknown, max: number, map: (x: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const raw of v) {
    if (out.length >= max) break;
    if (!raw || typeof raw !== "object") continue;
    const item = map(raw as Record<string, unknown>);
    if (item) out.push(item);
  }
  return out;
}

/** Elemento de galería válido: foto https (o /uploads) o video reconocible. */
function photo(v: unknown): AboutPhoto | null {
  if (!v || typeof v !== "object") return null;
  const x = v as Record<string, unknown>;
  const m = media({ kind: "image", url: x.url });
  if (!m) return null;
  return {
    url: m.url,
    position: safePosition(x.position),
    zoom: Math.max(1, Math.min(3, Number(x.zoom) || 1)),
  };
}

function media(x: Record<string, unknown>): AboutMedia | null {
  const url = line(x.url, 500);
  const caption = line(x.caption, ABOUT_LIMITS.caption);
  if (x.kind === "image") {
    return /^https:\/\/[^\s<>"']+$/i.test(url) || /^\/uploads\/[\w.-]+$/.test(url)
      ? { kind: "image", url, caption }
      : null;
  }
  if (x.kind === "video") return parseCoverVideo(url) ? { kind: "video", url, caption } : null;
  return null;
}

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;

/** Número de teléfono: solo dígitos, espacios, +, guiones y paréntesis. */
function phone(v: unknown): string {
  return line(v, 30).replace(/[^\d+\s()-]/g, "").trim();
}

/**
 * Red social: acepta la dirección completa (https://…) o solo el usuario
 * ("@surenos"), y devuelve siempre una dirección https de esa red. Vacío si
 * no se reconoce.
 */
export function normalizeSocial(key: SocialKey, raw: unknown): string {
  const v = line(raw, 200);
  if (!v) return "";
  if (/^https:\/\/[^\s<>"']+$/i.test(v)) {
    try {
      const u = new URL(v);
      const host = u.hostname.replace(/^www\.|^m\./, "");
      const ok: Record<SocialKey, (h: string) => boolean> = {
        instagram: (h) => h === "instagram.com",
        facebook: (h) => h === "facebook.com" || h === "fb.com",
        tiktok: (h) => h === "tiktok.com",
        youtube: (h) => h === "youtube.com" || h === "youtu.be",
        website: () => true,
      };
      return ok[key](host) ? u.toString() : "";
    } catch {
      return "";
    }
  }
  if (key === "website") {
    // "surenos.com" → https://surenos.com
    return /^[a-z0-9.-]+\.[a-z]{2,24}(\/\S*)?$/i.test(v) ? `https://${v}` : "";
  }
  const handle = v.replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(handle)) return "";
  const base: Record<Exclude<SocialKey, "website">, string> = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://www.tiktok.com/@",
    youtube: "https://www.youtube.com/@",
  };
  return base[key] + handle;
}

/** Limpia cualquier objeto (del formulario o de la BD) a una StoreAbout válida. */
export function sanitizeAbout(input: unknown): StoreAbout {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const L = ABOUT_LIMITS;
  const socialsIn = (o.socials && typeof o.socials === "object" ? o.socials : {}) as Record<
    string,
    unknown
  >;
  const socials = emptyAbout().socials;
  for (const k of SOCIAL_KEYS) socials[k] = normalizeSocial(k, socialsIn[k]);

  return {
    enabled: o.enabled === true,
    ctaLabel: line(o.ctaLabel, L.ctaLabel) || "Conócenos",
    headline: line(o.headline, L.headline),
    intro: line(o.intro, L.intro),
    story: text(o.story, L.story),
    highlights: list(o.highlights, L.highlights, (x) => {
      const value = line(x.value, L.highlightValue);
      const label = line(x.label, L.highlightLabel);
      return value && label ? { value, label } : null;
    }),
    gallery: list(o.gallery, L.gallery, media),
    storyPhoto: photo(o.storyPhoto),
    mission: text(o.mission, L.mission),
    vision: text(o.vision, L.vision),
    values: list(o.values, L.values, (x) => {
      const title = line(x.title, L.valueTitle);
      const t = line(x.text, L.valueText);
      return title ? { title, text: t } : null;
    }),
    phones: list(o.phones, L.phones, (x) => {
      const number = phone(x.number);
      return number.replace(/\D/g, "").length >= 7
        ? { label: line(x.label, L.label), number }
        : null;
    }),
    emails: list(o.emails, L.emails, (x) => {
      const email = line(x.email, 254).toLowerCase();
      return EMAIL_RE.test(email) ? { label: line(x.label, L.label), email } : null;
    }),
    socials,
    faqs: list(o.faqs, L.faqs, (x) => {
      const q = line(x.q, L.faqQ);
      const a = text(x.a, L.faqA);
      return q && a ? { q, a } : null;
    }),
  };
}

export function parseAbout(json: string | null | undefined): StoreAbout {
  if (!json) return emptyAbout();
  try {
    return sanitizeAbout(JSON.parse(json));
  } catch {
    return emptyAbout();
  }
}

/** ¿La página está activa y tiene algo que mostrar? */
export function aboutIsLive(a: StoreAbout): boolean {
  return (
    a.enabled &&
    !!(a.story || a.gallery.length || a.mission || a.vision || a.values.length || a.phones.length || a.emails.length || a.faqs.length)
  );
}
