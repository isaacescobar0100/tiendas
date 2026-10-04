import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  MapPin, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeDiscounts, applyDiscounts, discountedWhere } from "@/lib/discounts";
import { parseStorePhotos } from "@/lib/store-photos";
import { StorePhotoImg } from "@/components/store-photo";
import { isMerchProduct } from "@/lib/store-hours";
import { tracksStock } from "@/lib/store-type";
import { parseModifiers } from "@/lib/modifiers";
import { ProductCard } from "@/components/product-card";
import { BannerSlider, type BannerSlide } from "@/components/banner-slider";
import { storeBasePath, joinStorePath } from "@/lib/store-path";

export const dynamic = "force-dynamic";

async function getStore(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    include: { categories: { orderBy: { name: "asc" } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStore(storeSlug);
  if (!store) return { title: "Tienda no encontrada" };

  const description =
    store.description || `Compra en ${store.name}. Envíos a toda Colombia.`;
  const images = store.logoUrl ? [store.logoUrl] : [];
  return {
    title: store.name,
    description,
    openGraph: {
      title: store.name,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: store.name,
      description,
      images,
    },
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{
    cat?: string;
    q?: string;
    sort?: string;
    page?: string;
    offers?: string;
  }>;
}) {
  const { storeSlug } = await params;
  // Rutas de la tienda: sin el slug si se visita por su subdominio/dominio.
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const { cat, q, sort, page, offers } = await searchParams;

  const store = await getStore(storeSlug);
  if (!store) notFound();

  // Producto "en oferta": tiene precio de oferta válido (0 < oferta < precio).
  // Usa referencia de campo de Prisma para comparar dos columnas.
  // Descuentos por porcentaje vigentes (Admin > Descuentos): también cuentan
  // como "en oferta" y se aplican al precio de cada producto.
  const rules = await activeDiscounts(store.id);
  const saleWhere = {
    OR: [
      { salePriceCents: { gt: 0, lt: prisma.product.fields.priceCents } },
      ...discountedWhere(rules),
    ],
  };

  // Banner (slider): promociones que el admin marcó para esta vista.
  //  - Ofertas (offers): las marcadas "en Ofertas".
  //  - Categoría (cat):  las asignadas a esa categoría.
  //  - Inicio:           las marcadas "en el banner de inicio".
  const promotions = await prisma.promotion.findMany({
    where: { storeId: store.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const currentCategory = cat
    ? (store.categories.find((c) => c.slug === cat) ?? null)
    : null;

  const viewPromos = offers
    ? promotions.filter((p) => p.showOnOffers)
    : currentCategory
      ? promotions.filter((p) => p.categoryId === currentCategory.id)
      : promotions.filter((p) => p.showOnBanner);

  const promoSlides: BannerSlide[] = viewPromos.map((p) => ({
    imageUrl: p.imageUrl,
    imagePosition: p.imagePosition,
    imageZoom: p.imageZoom,
    videoUrl: p.videoUrl,
    title: p.title,
    subtitle: p.subtitle,
    linkUrl: p.linkUrl,
  }));

  // Slider: en el inicio, primero la portada de la tienda (video o foto, de
  // Ajustes > Portada) y después las promociones; en categorías/ofertas,
  // solo sus promociones.
  const isHome = !offers && !cat && !q;
  const cover: BannerSlide | null =
    isHome && (store.bannerVideoUrl || store.bannerUrl)
      ? {
          imageUrl: store.bannerUrl,
          videoUrl: store.bannerVideoUrl,
          title: store.name,
          subtitle: store.description,
          linkUrl: null,
        }
      : null;
  const bannerSlides: BannerSlide[] = [...(cover ? [cover] : []), ...promoSlides];


  // Por defecto (sin ordenar por precio): primero los MEJOR VALORADOS
  // (más estrellas y más reseñas), luego el resto por novedad. Aplica igual
  // en "Todos" y dentro de cada categoría.
  const orderBy:
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[] =
    sort === "price_asc"
      ? { priceCents: "asc" }
      : sort === "price_desc"
        ? { priceCents: "desc" }
        : [
            { ratingAvg: "desc" },
            { ratingCount: "desc" },
            { createdAt: "desc" },
          ];

  const where = {
    storeId: store.id,
    active: true,
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(offers ? saleWhere : {}),
  };

  const PAGE_SIZE = 12;
  const pageNum = Math.max(1, Number(page) || 1);

  const [total, rawProducts, offersCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      include: {
        variants: {
          select: { id: true, color: true, size: true, stock: true },
        },
      },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // ¿Hay al menos un producto en oferta? (para mostrar la pestaña).
    prisma.product.count({
      where: { storeId: store.id, active: true, ...saleWhere },
    }),
  ]);
  const products = applyDiscounts(rawProducts, rules);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasOffers = offersCount > 0;

  // Construye un href de la propia tienda preservando/actualizando filtros.
  // Cambiar categoría/orden reinicia a la página 1; solo la paginación pasa `page`.
  const mkHref = (over: {
    cat?: string | null;
    sort?: string | null;
    page?: number;
    offers?: boolean | null;
  }) => {
    const sp = new URLSearchParams();
    const nextCat = over.cat === undefined ? cat : over.cat;
    const nextSort = over.sort === undefined ? sort : over.sort;
    const nextOffers = over.offers === undefined ? Boolean(offers) : over.offers;
    if (nextCat) sp.set("cat", nextCat);
    if (q) sp.set("q", q);
    if (nextSort) sp.set("sort", nextSort);
    if (nextOffers) sp.set("offers", "1");
    if (over.page && over.page > 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return sh(qs ? `?${qs}` : "");
  };

  // Sedes/ubicaciones (para negocios con varias sedes).
  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    // Sin el id: es un dato interno y no debe salir en la página pública.
    select: { name: true, address: true },
  });


  const photos = parseStorePhotos(store.photosJson);

  return (
    <div>
      <BannerSlider slides={bannerSlides} />
      {/* Si la portada ya muestra el nombre, el título queda solo para
          lectores de pantalla y buscadores (no se repite en pantalla). */}
      <div className={bannerSlides[0]?.title === store.name ? "sr-only" : "mb-8"}>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{store.name}</h1>
        {store.description && <p className="mt-1 text-ink-3">{store.description}</p>}
      </div>

      {/* Búsqueda + orden */}
      <div className="mb-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" role="search" className="relative flex w-full sm:max-w-md">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {offers && <input type="hidden" name="offers" value="1" />}
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Buscar en el menú…"
            aria-label="Buscar productos"
            className="w-full rounded-full border border-line-2 bg-surface py-3 pl-12 pr-28 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
          <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover">
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-1 self-start rounded-full bg-surface-2 p-1 text-sm ring-1 ring-line sm:self-auto" aria-label="Ordenar">
          <span className="px-2 text-ink-3">Ordenar</span>
          <SortLink href={mkHref({ sort: null })} active={!sort}>
            Destacados
          </SortLink>
          <SortLink href={mkHref({ sort: "price_asc" })} active={sort === "price_asc"}>
            <span className="flex items-center gap-0.5">
              Precio <ArrowUp className="h-3 w-3" />
            </span>
          </SortLink>
          <SortLink
            href={mkHref({ sort: "price_desc" })}
            active={sort === "price_desc"}
          >
            <span className="flex items-center gap-0.5">
              Precio <ArrowDown className="h-3 w-3" />
            </span>
          </SortLink>
        </div>
      </div>

      {(store.categories.length > 0 || hasOffers) && (
        // Una sola fila deslizable que queda fija bajo la cabecera al bajar.
        <nav aria-label="Categorías" className="sticky top-[57px] z-[5] -mx-4 mb-6 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-3 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterPill href={mkHref({ cat: null, offers: null })} active={!cat && !offers}>
            Todos
          </FilterPill>
          {hasOffers && (
            <FilterPill
              href={mkHref({ cat: null, offers: true })}
              active={!!offers}
              tone="sale"
            >
              Ofertas
            </FilterPill>
          )}
          {store.categories.map((c) => (
            <FilterPill
              key={c.id}
              href={mkHref({ cat: c.slug, offers: null })}
              active={cat === c.slug && !offers}
            >
              {c.name}
            </FilterPill>
          ))}
        </nav>
      )}

      {q && (
        <p className="mb-4 text-sm text-ink-3">
          {total} resultado{total === 1 ? "" : "s"} para &ldquo;{q}&rdquo;
        </p>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 p-12 text-center text-ink-3">
          No hay productos{" "}
          {q
            ? "que coincidan con tu búsqueda"
            : offers
              ? "en oferta por ahora"
              : cat
                ? "en esta categoría"
                : "todavía"}
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              storeSlug={store.slug}
              currency={store.currency}
              freeShipping={store.shippingCents === 0}
              priority={i < 4}
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
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {pageNum > 1 ? (
            <Link
              href={mkHref({ page: pageNum - 1 })}
              className="flex items-center gap-1 rounded-lg border border-line-2 px-3 py-2 text-sm text-ink-2 hover:bg-surface-2"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span aria-disabled="true" className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm text-ink-4">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </span>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={mkHref({ page: n })}
              className={`rounded-lg px-3 py-2 text-sm ${
                n === pageNum
                  ? "bg-ink text-bg"
                  : "border border-line-2 text-ink-2 hover:bg-surface-2"
              }`}
            >
              {n}
            </Link>
          ))}

          {pageNum < totalPages ? (
            <Link
              href={mkHref({ page: pageNum + 1 })}
              className="flex items-center gap-1 rounded-lg border border-line-2 px-3 py-2 text-sm text-ink-2 hover:bg-surface-2"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span aria-disabled="true" className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm text-ink-4">
              Siguiente <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      )}

      {/* Nuestro lugar: fotos del negocio (Admin > Apariencia), solo en el inicio */}
      {isHome && photos.length > 0 && (
        <section className="mt-16" aria-labelledby="nuestro-lugar">
          <h2 id="nuestro-lugar" className="mb-6 text-lg font-bold text-ink">
            Nuestro lugar
          </h2>
          <div className="grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
            {photos.map((ph, i) => (
              <StorePhotoImg
                key={ph.url}
                photo={ph}
                alt={`Foto de ${store.name}`}
                className={`rounded-2xl ring-1 ring-line ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              />
            ))}
          </div>
        </section>
      )}

      {locations.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-lg font-bold text-ink">Ubicaciones</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((l, i) => (
              <div
                key={`${i}-${l.name}`}
                className="flex items-start gap-2 rounded-2xl border border-line p-5"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-text" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{l.name}</p>
                  {l.address && (
                    <p className="mt-0.5 text-sm text-ink-3">{l.address}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  tone = "default",
  children,
}: {
  href: string;
  active: boolean;
  tone?: "default" | "sale";
  children: React.ReactNode;
}) {
  const styles =
    tone === "sale"
      ? active
        ? "border-bad bg-bad text-white"
        : "border-bad/30 text-bad-ink hover:border-bad"
      : active
        ? "border-brand bg-brand text-brand-ink shadow-sm"
        : "border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink";
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${styles}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full px-3 py-1.5 font-medium transition ${
        active
          ? "bg-surface text-ink shadow-sm ring-1 ring-line"
          : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
