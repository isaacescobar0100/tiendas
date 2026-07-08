import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";

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
  searchParams: Promise<{ cat?: string; q?: string; sort?: string; page?: string }>;
}) {
  const { storeSlug } = await params;
  const { cat, q, sort, page } = await searchParams;

  const store = await getStore(storeSlug);
  if (!store) notFound();

  const orderBy =
    sort === "price_asc"
      ? { priceCents: "asc" as const }
      : sort === "price_desc"
        ? { priceCents: "desc" as const }
        : { createdAt: "desc" as const };

  const where = {
    storeId: store.id,
    active: true,
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const PAGE_SIZE = 12;
  const pageNum = Math.max(1, Number(page) || 1);

  const [total, products] = await Promise.all([
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
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Construye un href de la propia tienda preservando/actualizando filtros.
  // Cambiar categoría/orden reinicia a la página 1; solo la paginación pasa `page`.
  const mkHref = (over: {
    cat?: string | null;
    sort?: string | null;
    page?: number;
  }) => {
    const sp = new URLSearchParams();
    const nextCat = over.cat === undefined ? cat : over.cat;
    const nextSort = over.sort === undefined ? sort : over.sort;
    if (nextCat) sp.set("cat", nextCat);
    if (q) sp.set("q", q);
    if (nextSort) sp.set("sort", nextSort);
    if (over.page && over.page > 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return `/${store.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      {store.bannerUrl && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200">
          {/* Ancho completo y altura automática: la imagen se ve entera y se
              adapta sola a PC y móvil sin recortes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={store.bannerUrl}
            alt={`Banner de ${store.name}`}
            className="block h-auto w-full"
          />
        </div>
      )}

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

      {store.categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <FilterPill href={mkHref({ cat: null })} active={!cat}>
            Todos
          </FilterPill>
          {store.categories.map((c) => (
            <FilterPill
              key={c.id}
              href={mkHref({ cat: c.slug })}
              active={cat === c.slug}
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
          No hay productos {q ? "que coincidan con tu búsqueda" : cat ? "en esta categoría" : "todavía"}.
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
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 text-gray-600 hover:border-gray-900"
      }`}
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
