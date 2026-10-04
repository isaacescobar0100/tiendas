// SEO de cada tienda: direcciones canónicas, títulos con ciudad y lo que vende,
// ubicación de las sedes y datos estructurados (schema.org) que leen Google,
// Google Maps y los buscadores con IA (ChatGPT, Gemini, Perplexity…).
import type { StoreType } from "@prisma/client";
import { storePublicUrl } from "@/lib/site-url";
import { slugify } from "@/lib/utils";
import { parseStoreHours } from "@/lib/store-hours";

type StoreLike = { slug: string; customDomain?: string | null };

/** Dirección absoluta de una página de la tienda (su dominio o subdominio). */
export function storeUrl(store: StoreLike, path = ""): string {
  const base = storePublicUrl(store);
  if (!path || path === "/") return base;
  return base + (path.startsWith("/") ? path : `/${path}`);
}

/** Parte de la dirección de una sede: "Sede Las Nieves" → "las-nieves". */
export function sedeSlug(name: string): string {
  const s = slugify(name);
  return s.replace(/^sede-/, "") || s;
}

/**
 * Coordenadas desde lo que pegue el admin: un enlace de Google Maps
 * (…/@10.98,-74.80,17z o …!3d10.98!4d-74.80 o ?q=10.98,-74.80) o el texto
 * "10.98, -74.80". Devuelve null si no encuentra coordenadas válidas.
 */
export function parseCoords(input: string | null | undefined): { lat: number; lng: number } | null {
  const v = String(input ?? "").trim();
  if (!v) return null;
  const pats = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // lugar exacto del pin
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // centro del mapa
    /[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
    /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/, // "lat, lng"
  ];
  for (const re of pats) {
    const m = v.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: round6(lat), lng: round6(lng) };
  }
  return null;
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Enlace "Cómo llegar": el de Google Maps del admin, las coordenadas o la dirección. */
export function directionsUrl(loc: { lat?: number | null; lng?: number | null; mapsUrl?: string | null; address?: string | null }): string | null {
  if (loc.mapsUrl && /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(loc.mapsUrl)) {
    return loc.mapsUrl;
  }
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    // Solo la dirección: con el nombre, Google puede escoger la ficha de otra sede.
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  return null;
}

/** Mapa incrustado (sin llave de API). */
export function mapEmbedUrl(loc: { lat?: number | null; lng?: number | null; address?: string | null }): string | null {
  const q = loc.lat != null && loc.lng != null ? `${loc.lat},${loc.lng}` : loc.address || null;
  return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed` : null;
}

// ─── Textos para Google ────────────────────────────────────────────────────

const TYPE_WORDS: Record<StoreType, string> = {
  FOOD: "Comidas rápidas",
  FASHION: "Ropa y moda",
  LIQUOR: "Licores",
};

export type SeoStore = StoreLike & {
  name: string;
  type: StoreType;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoCity?: string | null;
  seoKeywords?: string | null;
};

export function seoKeywords(store: SeoStore): string[] {
  return String(store.seoKeywords ?? "")
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** "Hamburguesas, desgranados y salchipapas en Barranquilla" (para títulos). */
export function seoTagline(store: SeoStore, max = 3): string {
  const kw = seoKeywords(store).slice(0, max);
  const what = kw.length
    ? kw.length === 1
      ? kw[0]
      : `${kw.slice(0, -1).join(", ")} y ${kw[kw.length - 1].toLowerCase()}`
    : TYPE_WORDS[store.type];
  return store.seoCity ? `${what} en ${store.seoCity}` : what;
}

/** Título de la portada en Google: "Sureños Club | Hamburguesas y … en Barranquilla". */
export function seoHomeTitle(store: SeoStore): string {
  if (store.seoTitle?.trim()) return store.seoTitle.trim();
  // Google corta hacia los 60 caracteres: si se pasa, menos productos.
  for (const n of [3, 2, 1]) {
    const t = `${store.name} | ${seoTagline(store, n)}`;
    if (t.length <= 60 || n === 1) return t;
  }
  return store.name;
}

/** Descripción de la portada en Google (~160 caracteres). */
export function seoHomeDescription(store: SeoStore): string {
  if (store.seoDescription?.trim()) return store.seoDescription.trim();
  const base = store.description?.trim() || seoTagline(store);
  const tail = store.type === "FOOD" ? " Pide en línea y paga fácil." : " Compra en línea con envío.";
  return clip(`${base}.${tail}`.replace(/\.\./g, "."), 160);
}

export const clip = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);

// ─── Datos estructurados (schema.org) ──────────────────────────────────────

const BUSINESS_TYPE: Record<StoreType, string> = {
  FOOD: "FastFoodRestaurant",
  FASHION: "ClothingStore",
  LIQUOR: "LiquorStore",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Horario de la tienda en formato schema.org (solo si está activo). */
export function openingHoursSpec(hoursJson: string | null | undefined) {
  const h = parseStoreHours(hoursJson);
  if (!h?.enabled) return undefined;
  const out = h.days
    .map((d, i) => (d.closed || !d.open || !d.close ? null : { "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[i], opens: d.open, closes: d.close }))
    .filter(Boolean);
  return out.length ? out : undefined;
}

export type SeoLocation = {
  name: string;
  address: string | null;
  whatsapp: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
};

export function phoneE164(raw: string | null | undefined): string | undefined {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10) return `+57${d}`;
  if (d.length === 12 && d.startsWith("57")) return `+${d}`;
  return undefined;
}

/** Negocio de cada sede (Restaurante / Tienda) con dirección, mapa, teléfono y horario. */
export function locationJsonLd(
  store: SeoStore & { logoUrl?: string | null; hoursJson?: string | null; bannerUrl?: string | null },
  loc: SeoLocation,
) {
  const url = storeUrl(store, `/sedes/${sedeSlug(loc.name)}`);
  return {
    "@type": BUSINESS_TYPE[store.type],
    "@id": `${url}#negocio`,
    name: `${store.name} · ${loc.name}`,
    url,
    image: store.bannerUrl || store.logoUrl || undefined,
    logo: store.logoUrl || undefined,
    telephone: phoneE164(loc.whatsapp),
    priceRange: "$$",
    servesCuisine: store.type === "FOOD" ? seoKeywords(store).slice(0, 5) : undefined,
    hasMenu: store.type === "FOOD" ? storeUrl(store, "/menu") : undefined,
    address: loc.address
      ? {
          "@type": "PostalAddress",
          streetAddress: loc.address.replace(new RegExp(`,?\\s*${escapeRe(store.seoCity ?? "")}\\s*$`, "i"), "").trim() || loc.address,
          addressLocality: store.seoCity || undefined,
          addressCountry: "CO",
        }
      : undefined,
    geo: loc.lat != null && loc.lng != null ? { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng } : undefined,
    hasMap: directionsUrl(loc) ?? undefined,
    openingHoursSpecification: openingHoursSpec(store.hoursJson),
    parentOrganization: { "@id": `${storeUrl(store)}#marca` },
  };
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Marca + sitio web (con buscador) + negocio de cada sede, para la portada. */
export function storeJsonLd(
  store: SeoStore & { logoUrl?: string | null; hoursJson?: string | null; bannerUrl?: string | null },
  locations: SeoLocation[],
  sameAs: string[] = [],
  rating?: { avg: number; count: number },
) {
  const home = storeUrl(store);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${home}#marca`,
        name: store.name,
        url: home,
        logo: store.logoUrl || undefined,
        description: seoHomeDescription(store),
        sameAs: sameAs.length ? sameAs : undefined,
        aggregateRating:
          rating && rating.count > 0
            ? { "@type": "AggregateRating", ratingValue: Number(rating.avg.toFixed(1)), reviewCount: rating.count }
            : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${home}#sitio`,
        name: store.name,
        url: home,
        inLanguage: "es-CO",
        publisher: { "@id": `${home}#marca` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${home}/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      ...locations.map((l) => locationJsonLd(store, l)),
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

const money = (cents: number) => (cents / 100).toFixed(0);

/** Producto con precio, disponibilidad y valoración. */
export function productJsonLd(
  store: SeoStore,
  p: {
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    images?: string[];
    priceCents: number;
    salePriceCents: number | null;
    ratingAvg: number;
    ratingCount: number;
    inStock: boolean;
    category?: string | null;
  },
  currency: string,
) {
  const price = p.salePriceCents && p.salePriceCents > 0 && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: [p.imageUrl, ...(p.images ?? [])].filter(Boolean),
    category: p.category || undefined,
    brand: { "@type": "Brand", name: store.name },
    url: storeUrl(store, `/${p.slug}`),
    offers: {
      "@type": "Offer",
      price: money(price),
      priceCurrency: currency,
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: storeUrl(store, `/${p.slug}`),
      seller: { "@id": `${storeUrl(store)}#marca` },
    },
    aggregateRating:
      p.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: Number(p.ratingAvg.toFixed(1)), reviewCount: p.ratingCount } : undefined,
  };
}

/** Carta completa (secciones y platos con precio) para el menú. */
export function menuJsonLd(
  store: SeoStore,
  sections: { name: string; items: { name: string; description: string | null; priceCents: number; imageUrl: string | null; slug: string }[] }[],
  currency: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menú de ${store.name}`,
    url: storeUrl(store, "/menu"),
    inLanguage: "es-CO",
    hasMenuSection: sections.map((s) => ({
      "@type": "MenuSection",
      name: s.name,
      hasMenuItem: s.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        description: i.description || undefined,
        image: i.imageUrl || undefined,
        url: storeUrl(store, `/${i.slug}`),
        offers: { "@type": "Offer", price: money(i.priceCents), priceCurrency: currency },
      })),
    })),
  };
}
