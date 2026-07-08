import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
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
  searchParams: Promise<{
    cat?: string;
    q?: string;
    sort?: string;
    page?: string;
    size?: string;
    color?: string;
    min?: string;
    max?: string;
    stock?: string;
  }>;
}) {
  const { storeSlug } = await params;
  const { cat, q, sort, page, size, color, min, max, stock } =
    await searchParams;

  const store = await getStore(storeSlug);
  if (!store) notFound();

  const orderBy =
    sort === "price_asc"
      ? { priceCents: "asc" as const }
      : sort === "price_desc"
        ? { priceCents: "desc" as const }
        : { createdAt: "desc" as const };

  // Precio: el cliente escribe en pesos; en la BD está en céntimos.
  const minCents = min && Number(min) > 0 ? Math.round(Number(min) * 100) : null;
  const maxCents = max && Number(max) > 0 ? Math.round(Number(max) * 100) : null;
  const priceFilter =
    minCents || maxCents
      ? {
          priceCents: {
            ...(minCents ? { gte: minCents } : {}),
            ...(maxCents ? { lte: maxCents } : {}),
          },
        }
      : {};

  // Talla y color: si ambos están, deben coincidir en la MISMA variante.
  const variantFilter =
    size && color
      ? { variants: { some: { size, color } } }
      : size
        ? { variants: { some: { size } } }
        : color
          ? { variants: { some: { color } } }
          : {};

  // Solo disponibles: stock del producto o de alguna variante.
  const stockFilter = stock
    ? {
        OR: [
          { stock: { gt: 0 } },
          { variants: { some: { stock: { gt: 0 } } } },
        ],
      }
    : {};

  const where = {
    storeId: store.id,
    active: true,
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...priceFilter,
    ...variantFilter,
    ...stockFilter,
  };

  const PAGE_SIZE = 12;
  const pageNum = Math.max(1, Number(page) || 1);

  const [total, products, variantOpts] = await Promise.all([
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
    // Tallas y colores disponibles en la tienda (para las opciones de filtro).
    prisma.productVariant.findMany({
      where: { product: { storeId: store.id, active: true } },
      select: { color: true, size: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sizes = [...new Set(variantOpts.map((v) => v.size).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es", { numeric: true }),
  );
  const colors = [
    ...new Set(variantOpts.map((v) => v.color).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const activeFilters =
    (cat ? 1 : 0) +
    (size ? 1 : 0) +
    (color ? 1 : 0) +
    (minCents || maxCents ? 1 : 0) +
    (stock ? 1 : 0);

  // Construye un href de la tienda combinando los filtros actuales con `over`.
  // Cualquier cambio de filtro reinicia a la página 1 (solo la paginación pasa `page`).
  const current: Record<string, string | undefined> = {
    cat,
    q,
    sort,
    size,
    color,
    min,
    max,
    stock,
  };
  const mkHref = (over: Record<string, string | number | null | undefined>) => {
    const merged = { ...current, ...over };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (k === "page") continue;
      if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
    }
    if (over.page && Number(over.page) > 1) sp.set("page", String(over.page));
    const qs = sp.toString();
    return `/${store.slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
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
          {size && <input type="hidden" name="size" value={size} />}
          {color && <input type="hidden" name="color" value={color} />}
          {min && <input type="hidden" name="min" value={min} />}
          {max && <input type="hidden" name="max" value={max} />}
          {stock && <input type="hidden" name="stock" value={stock} />}
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

      {/* Filtros avanzados: precio, talla, color y disponibilidad */}
      <details className="mb-8 rounded-2xl border border-gray-200 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-gray-700">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">
              {activeFilters}
            </span>
          )}
        </summary>

        <div className="mt-4 space-y-5">
          {/* Precio (en pesos) */}
          <form method="get" className="flex flex-wrap items-end gap-2">
            {cat && <input type="hidden" name="cat" value={cat} />}
            {q && <input type="hidden" name="q" value={q} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            {size && <input type="hidden" name="size" value={size} />}
            {color && <input type="hidden" name="color" value={color} />}
            {stock && <input type="hidden" name="stock" value={stock} />}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Precio desde
              </label>
              <input
                name="min"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={min ?? ""}
                placeholder="0"
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                hasta
              </label>
              <input
                name="max"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={max ?? ""}
                placeholder="Sin tope"
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <button className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              Aplicar
            </button>
          </form>

          {sizes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Talla</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <FilterPill
                    key={s}
                    href={mkHref({ size: size === s ? null : s })}
                    active={size === s}
                  >
                    {s}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <FilterPill
                    key={c}
                    href={mkHref({ color: color === c ? null : c })}
                    active={color === c}
                  >
                    {c}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterPill
              href={mkHref({ stock: stock ? null : "1" })}
              active={!!stock}
            >
              Solo disponibles
            </FilterPill>
            {activeFilters > 0 && (
              <Link
                href={mkHref({
                  cat: null,
                  size: null,
                  color: null,
                  min: null,
                  max: null,
                  stock: null,
                })}
                className="text-sm text-gray-500 underline hover:text-gray-900"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
        </div>
      </details>

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
