import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { BannerSlider, type BannerSlide } from "@/components/banner-slider";

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
  const { cat, q, sort, page, offers } = await searchParams;

  const store = await getStore(storeSlug);
  if (!store) notFound();

  // Banner: promociones activas (slider). Si no hay, se usa el banner de la
  // tienda con el nombre/descripción como única diapositiva.
  const promotions = await prisma.promotion.findMany({
    where: { storeId: store.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const bannerSlides: BannerSlide[] =
    promotions.length > 0
      ? promotions.map((p) => ({
          imageUrl: p.imageUrl,
          title: p.title,
          subtitle: p.subtitle,
          linkUrl: p.linkUrl,
        }))
      : store.bannerUrl
        ? [
            {
              imageUrl: store.bannerUrl,
              title: store.name,
              subtitle: store.description,
              linkUrl: null,
            },
          ]
        : [];

  const orderBy =
    sort === "price_asc"
      ? { priceCents: "asc" as const }
      : sort === "price_desc"
        ? { priceCents: "desc" as const }
        : { createdAt: "desc" as const };

  // Producto "en oferta": tiene precio de oferta válido (0 < oferta < precio).
  // Usa referencia de campo de Prisma para comparar dos columnas.
  const saleWhere = {
    salePriceCents: { gt: 0, lt: prisma.product.fields.priceCents },
  };

  const where = {
    storeId: store.id,
    active: true,
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(offers ? saleWhere : {}),
  };

  const PAGE_SIZE = 12;
  const pageNum = Math.max(1, Number(page) || 1);

  const [total, products, offersCount] = await Promise.all([
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
    return `/${store.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <BannerSlider slides={bannerSlides} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
        {store.description && (
          <p className="mt-1 text-gray-500">{store.description}</p>
        )}
      </div>

      {/* Búsqueda + orden */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex w-full gap-2 sm:max-w-sm">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {offers && <input type="hidden" name="offers" value="1" />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar productos…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
          <button className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Ordenar:</span>
          <SortLink href={mkHref({ sort: null })} active={!sort}>
            Novedades
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
        <div className="mb-8 flex flex-wrap gap-2">
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
        </div>
      )}

      {q && (
        <p className="mb-4 text-sm text-gray-500">
          {total} resultado{total === 1 ? "" : "s"} para &ldquo;{q}&rdquo;
        </p>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
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
          {products.map((p) => (
            <ProductCard
              key={p.id}
              storeSlug={store.slug}
              currency={store.currency}
              freeShipping={store.shippingCents === 0}
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
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-300">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </span>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={mkHref({ page: n })}
              className={`rounded-lg px-3 py-2 text-sm ${
                n === pageNum
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {n}
            </Link>
          ))}

          {pageNum < totalPages ? (
            <Link
              href={mkHref({ page: pageNum + 1 })}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-300">
              Siguiente <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
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
        ? "border-red-600 bg-red-600 text-white"
        : "border-red-300 text-red-600 hover:border-red-600"
      : active
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-300 text-gray-600 hover:border-gray-900";
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${styles}`}
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
      className={`rounded-md px-2 py-1 transition ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}
