import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, MapPin, MessageCircle, Navigation, UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { bogotaDow, DAY_ORDER, getStoreOpenState, parseStoreHours, isMerchProduct } from "@/lib/store-hours";
import { whatsappLink } from "@/lib/whatsapp";
import { activeDiscounts, applyDiscounts } from "@/lib/discounts";
import { parseModifiers } from "@/lib/modifiers";
import { tracksStock } from "@/lib/store-type";
import {
  storeUrl,
  sedeSlug,
  seoTagline,
  clip,
  directionsUrl,
  mapEmbedUrl,
  locationJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";

async function getData(storeSlug: string, sede: string) {
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    include: {
      locations: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!store) return null;
  const loc = store.locations.find((l) => sedeSlug(l.name) === sede);
  if (!loc) return null;
  return { store, loc };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; sede: string }>;
}): Promise<Metadata> {
  const { storeSlug, sede } = await params;
  const data = await getData(storeSlug, sede);
  if (!data) return { title: "Sede no encontrada" };
  const { store, loc } = data;
  const canonical = storeUrl(store, `/sedes/${sedeSlug(loc.name)}`);
  const where = loc.address ? ` en ${loc.address}` : "";
  const description = clip(
    `${store.name} ${loc.name}${where}. ${seoTagline(store)}. Horario, cómo llegar y pedidos a domicilio.`,
    160,
  );
  return {
    title: `${loc.name}: dirección, horario y domicilios`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${store.name} · ${loc.name}`,
      description,
      url: canonical,
      images: [store.bannerUrl, store.logoUrl].filter(Boolean) as string[],
      locale: "es_CO",
    },
  };
}

// "18:30" → "6:30 p. m."
function hour12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

// Página pública de una sede: SEO local ("comidas rápidas en Las Nieves").
export default async function SedePage({
  params,
}: {
  params: Promise<{ storeSlug: string; sede: string }>;
}) {
  const { storeSlug, sede } = await params;
  const data = await getData(storeSlug, sede);
  if (!data) notFound();
  const { store, loc } = data;
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const isFood = store.type === "FOOD";

  const hours = parseStoreHours(store.hoursJson);
  const open = getStoreOpenState(store.hoursJson);
  const today = bogotaDow();
  const wa = whatsappLink(loc.whatsapp, `Hola ${loc.name}, quiero hacer un pedido.`);
  const go = directionsUrl(loc);
  const map = mapEmbedUrl(loc);
  const others = store.locations.filter((l) => l.id !== loc.id);

  // Lo más pedido / mejor valorado de la carta.
  const rules = await activeDiscounts(store.id);
  const top = applyDiscounts(
    await prisma.product.findMany({
      where: { storeId: store.id, active: true },
      orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }],
      include: { variants: { select: { id: true, color: true, size: true, stock: true } } },
      take: 8,
    }),
    rules,
  );

  const ld = { "@context": "https://schema.org", ...locationJsonLd(store, loc) };
  const crumbs = breadcrumbJsonLd([
    { name: store.name, url: storeUrl(store) },
    { name: "Sedes", url: storeUrl(store, "/sedes") },
    { name: loc.name, url: storeUrl(store, `/sedes/${sedeSlug(loc.name)}`) },
  ]);

  return (
    <div className="space-y-10">
      <JsonLd data={ld} />
      <JsonLd data={crumbs} />

      <nav aria-label="Ruta" className="text-sm text-ink-3">
        <Link href={sh()} className="hover:text-ink">{store.name}</Link>
        <span className="mx-1.5">›</span>
        <Link href={sh("/sedes")} className="hover:text-ink">Sedes</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink-2">{loc.name}</span>
      </nav>

      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-text">{seoTagline(store)}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {store.name} · {loc.name}
        </h1>
        {loc.address && <p className="mt-2 flex items-center gap-1.5 text-lg text-ink-2"><MapPin className="h-5 w-5 text-brand-text" /> {loc.address}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={sh()} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-hover">
            {isFood ? "Pedir a domicilio" : "Comprar en línea"} <ChevronRight className="h-4 w-4" />
          </Link>
          {isFood && (
            <Link href={sh(`/menu?sede=${encodeURIComponent(loc.name)}`)} className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:border-brand hover:text-ink">
              <UtensilsCrossed className="h-4 w-4" /> Ver el menú
            </Link>
          )}
          {go && (
            <a href={go} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:border-brand hover:text-ink">
              <Navigation className="h-4 w-4" /> Cómo llegar
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 hover:border-brand hover:text-ink">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {map ? (
          <div className="overflow-hidden rounded-3xl border border-line bg-surface">
            <iframe
              src={map}
              title={`Mapa de ${store.name} ${loc.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full border-0 sm:h-96"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="h-fit rounded-3xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Clock className="h-5 w-5 text-brand-text" /> Horario
            </h2>
            {hours?.enabled && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${open.isOpen ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink"}`}>
                {open.isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            )}
          </div>
          {hours?.enabled ? (
            <dl className="divide-y divide-line text-sm">
              {DAY_ORDER.map(({ idx, label }) => {
                const d = hours.days[idx];
                return (
                  <div key={idx} className={`flex justify-between gap-3 py-2 ${idx === today ? "font-semibold text-ink" : "text-ink-2"}`}>
                    <dt>{label}{idx === today && <span className="ml-1.5 text-xs text-brand-text">hoy</span>}</dt>
                    <dd className="text-right">
                      {d.closed || !d.open || !d.close ? "Cerrado" : (<><span className="whitespace-nowrap">{hour12(d.open)}</span> – <span className="whitespace-nowrap">{hour12(d.close)}</span></>)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-sm text-ink-3">Escríbenos por WhatsApp para confirmar el horario de atención.</p>
          )}
        </div>
      </div>

      {top.length > 0 && (
        <section aria-labelledby="h-destacados">
          <h2 id="h-destacados" className="mb-5 text-2xl font-extrabold tracking-tight text-ink">
            {isFood ? "Lo más pedido" : "Destacados"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {top.map((p) => (
              <ProductCard
                key={p.id}
                storeSlug={store.slug}
                currency={store.currency}
                freeShipping={store.shippingCents === 0}
                rating={{ avg: p.ratingAvg, count: p.ratingCount }}
                tracksStock={tracksStock(store.type)}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  priceCents: p.priceCents,
                  salePriceCents: p.salePriceCents,
                  imageUrl: p.imageUrl,
                  imagePosition: p.imagePosition,
                  imageZoom: p.imageZoom,
                  stock: p.stock,
                  alwaysAvailable: isMerchProduct(p.categoryId, store.merchCategoryIds),
                  hasModifiers: parseModifiers(p.modifiersJson).length > 0,
                  variants: p.variants,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="h-otras">
          <h2 id="h-otras" className="mb-4 text-lg font-bold text-ink">Otras sedes</h2>
          <ul className="flex flex-wrap gap-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={sh(`/sedes/${sedeSlug(o.name)}`)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 hover:border-brand hover:text-ink">
                  <MapPin className="h-4 w-4 text-brand-text" /> {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
