import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { fillGrid } from "@/lib/grid-fill";
import { storeUrl, sedeSlug, seoTagline, clip, breadcrumbJsonLd, locationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { withAutoKeywords } from "@/lib/seo-data";

// cache(): metadata y página la piden en el mismo render.
const getStore = cache(async (slug: string) => {
  const store = await prisma.store.findFirst({
    where: { slug, active: true },
    include: { locations: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  return store ? withAutoKeywords(store) : null;
});

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStore(storeSlug);
  if (!store) return { title: "Sedes" };
  const canonical = storeUrl(store, "/sedes");
  const names = store.locations.map((l) => l.name).join(", ");
  const description = clip(`${store.name}: ${seoTagline(store)}. Nuestras sedes: ${names}. Dirección, horario y cómo llegar.`, 160);
  return {
    title: store.seoCity ? `Sedes en ${store.seoCity}` : "Sedes",
    description,
    alternates: { canonical },
    openGraph: { title: `Sedes de ${store.name}`, description, url: canonical, locale: "es_CO" },
  };
}

// Índice de sedes (SEO local): enlaza a la página de cada una.
export default async function SedesPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStore(storeSlug);
  if (!store || store.locations.length === 0) notFound();
  const base = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(base, p);
  const grid = fillGrid(store.locations.length);

  return (
    <div className="space-y-8">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": store.locations.map((l) => locationJsonLd(store, l)) }} />
      <JsonLd data={breadcrumbJsonLd([{ name: store.name, url: storeUrl(store) }, { name: "Sedes", url: storeUrl(store, "/sedes") }])} />
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-text">{seoTagline(store)}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Sedes de {store.name}</h1>
      </header>
      <ul className={`${grid.grid} gap-4`}>
        {store.locations.map((l, i) => (
          <li key={l.id} className={i === store.locations.length - 1 ? grid.last : ""}>
            <Link href={sh(`/sedes/${sedeSlug(l.name)}`)} className="group flex h-full items-start gap-3 rounded-3xl border border-line bg-surface p-5 transition hover:border-brand">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-ink">{l.name}</span>
                {l.address && <span className="mt-0.5 block text-sm text-ink-3">{l.address}</span>}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-text">
                  Dirección y horario <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
