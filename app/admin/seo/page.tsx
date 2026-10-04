import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, Globe2, MapPinned, Search, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { aboutIsLive, parseAbout } from "@/lib/about";
import { parseStoreHours } from "@/lib/store-hours";
import { storeUrl, seoHomeDescription, seoKeywords } from "@/lib/seo";
import { SeoForm } from "./seo-form";
import { categoryKeywords } from "@/lib/seo-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO y Google" };

type Check = { ok: boolean; label: string; hint: string; href?: string };

// SEO y Google: textos para buscadores, puntaje con lo que falta y guía para
// Google Maps (perfil de empresa) y Search Console.
export default async function SeoPage() {
  const { store } = await requireAdminStore();
  const [locations, products] = await Promise.all([
    prisma.storeLocation.findMany({ where: { storeId: store.id }, select: { name: true, address: true, lat: true, lng: true } }),
    prisma.product.findMany({ where: { storeId: store.id, active: true }, select: { imageUrl: true, description: true } }),
  ]);
  const about = parseAbout(store.aboutJson);
  const hours = parseStoreHours(store.hoursJson);
  const withPhoto = products.filter((p) => p.imageUrl).length;
  const withDesc = products.filter((p) => (p.description ?? "").trim().length >= 20).length;
  const withAddr = locations.filter((l) => l.address).length;
  const withGeo = locations.filter((l) => l.lat != null && l.lng != null).length;
  const home = storeUrl(store);
  const autoKeywords = (await categoryKeywords(store.id, store.merchCategoryIds)) ?? "";

  const checks: Check[] = [
    { ok: !!store.logoUrl, label: "Logo de la tienda", hint: "Aparece en Google y al compartir.", href: "/admin/settings" },
    { ok: !!store.seoCity, label: "Ciudad principal", hint: "Clave para salir en búsquedas locales." },
    { ok: seoKeywords(store).length >= 3, label: "Al menos 3 cosas que vendes", hint: "Ej: hamburguesas, desgranados, salchipapas." },
    { ok: !!(store.seoDescription || store.description), label: "Descripción", hint: "El texto que se ve bajo el título en Google." },
    ...(locations.length
      ? [
          { ok: withAddr === locations.length, label: `Dirección de las sedes (${withAddr}/${locations.length})`, hint: "Cada sede tiene su propia página en Google.", href: "/admin/sedes" },
          { ok: withGeo === locations.length, label: `Ubicación en el mapa (${withGeo}/${locations.length})`, hint: "Pega el enlace de Google Maps de cada sede.", href: "/admin/sedes" },
        ]
      : []),
    { ok: !!hours?.enabled, label: "Horario de atención", hint: "Google y las IA lo muestran a quien busca.", href: "/admin/settings/horario" },
    { ok: aboutIsLive(about), label: "Página Conócenos publicada", hint: "Quiénes son: las IA la usan para hablar de tu negocio.", href: "/admin/nosotros" },
    { ok: about.faqs.length >= 3, label: "Preguntas frecuentes (3 o más)", hint: "Responden dudas directo en Google y en ChatGPT.", href: "/admin/nosotros" },
    { ok: products.length > 0 && withPhoto === products.length, label: `Productos con foto (${withPhoto}/${products.length})`, hint: "Las fotos salen en Google Imágenes.", href: "/admin/products" },
    { ok: products.length > 0 && withDesc >= products.length * 0.8, label: `Productos con descripción (${withDesc}/${products.length})`, hint: "Qué lleva cada plato o producto.", href: "/admin/products" },
    { ok: !!store.customDomain, label: "Dominio propio", hint: "Ej: surenosclub.com. Da más confianza y posiciona mejor (lo configura el equipo de la plataforma)." },
  ];
  const done = checks.filter((c) => c.ok).length;
  const score = Math.round((done / checks.length) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Search className="h-6 w-6" /> SEO y Google
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Tu tienda ya va lista para Google, Google Maps y los buscadores con IA (ChatGPT, Gemini, Perplexity):
          cada página lleva sus datos de negocio, sedes, menú y precios. Aquí completas lo que falta.
        </p>
      </div>

      {/* Puntaje */}
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--color-brand) ${score * 3.6}deg, var(--color-surface-3) 0)` }}
            aria-label={`Puntaje SEO ${score} de 100`}
          >
            <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-surface text-2xl font-extrabold text-ink">{score}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-ink">
              {score >= 90 ? "¡Excelente! Tu tienda está muy completa." : score >= 60 ? "Vas bien. Completa lo que falta para subir." : "Completa estos puntos para que Google te muestre más."}
            </p>
            <p className="text-sm text-ink-3">{done} de {checks.length} listos</p>
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
              {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-4" />}
              <span className="min-w-0 text-sm">
                <span className={`block font-semibold ${c.ok ? "text-ink" : "text-ink-2"}`}>{c.label}</span>
                <span className="block text-xs text-ink-3">{c.hint}</span>
                {!c.ok && c.href && (
                  <Link href={c.href} className="mt-0.5 inline-block text-xs font-semibold text-brand-text hover:underline">
                    Completar →
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <SeoForm
        initial={{
          seoTitle: store.seoTitle ?? "",
          seoDescription: store.seoDescription ?? "",
          seoCity: store.seoCity ?? "",
          seoKeywords: store.seoKeywords ?? "",
        }}
        storeName={store.name}
        storeType={store.type}
        autoKeywords={autoKeywords}
        url={home}
        autoDescription={seoHomeDescription({ ...store, seoKeywords: store.seoKeywords || autoKeywords, seoDescription: null })}
      />

      {/* Guía: lo que hace el dueño fuera del sistema */}
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink">Siguientes pasos en Google (los haces tú, una sola vez)</h2>
        <Step
          icon={<MapPinned className="h-5 w-5" />}
          title="1. Perfil de empresa en Google (Google Maps) — el más importante"
          text={`Crea o reclama un perfil por cada sede, con la misma dirección y teléfono que tienes aquí. En «Sitio web» pon ${home} y en «Menú» pon ${home}/menu. Pide a tus clientes reseñas ahí.`}
          href="https://www.google.com/business/"
          cta="Abrir Perfil de empresa"
        />
        <Step
          icon={<Search className="h-5 w-5" />}
          title="2. Google Search Console"
          text={`Agrega tu tienda (${home}) y en «Sitemaps» envía ${home}/sitemap.xml. Así Google descubre todas tus páginas y te muestra cómo te buscan.`}
          href="https://search.google.com/search-console"
          cta="Abrir Search Console"
        />
        <Step
          icon={<Sparkles className="h-5 w-5" />}
          title="3. Comprueba tus datos para Google"
          text="Revisa que Google lea bien tu negocio, menú y productos (resultados enriquecidos con precio y estrellas)."
          href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(home)}`}
          cta="Probar mi tienda"
        />
        <div className="flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-ink-3"><Globe2 className="h-4 w-4" /> Archivos para buscadores:</span>
          {[
            ["sitemap.xml", `${home}/sitemap.xml`],
            ["robots.txt", `${home}/robots.txt`],
            ["llms.txt (para IA)", `${home}/llms.txt`],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line-2 px-3 py-1 font-medium text-ink-2 hover:bg-surface-2">
              {label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          El posicionamiento en Google toma semanas o meses y ningún sistema puede garantizar un puesto; lo que sí queda
          garantizado es que tu tienda esté técnicamente lista para competir.
        </p>
      </section>
    </div>
  );
}

function Step({ icon, title, text, href, cta }: { icon: React.ReactNode; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-surface-2 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-0.5 break-words text-sm text-ink-3">{text}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
          {cta} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
