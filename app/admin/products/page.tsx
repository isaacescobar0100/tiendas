import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import { isOnSale } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { store } = await requireAdminStore();
  const { cat, q } = await searchParams;

  // Filtro por categoría (slug) o "sin categoría", + búsqueda por nombre.
  const where = {
    storeId: store.id,
    ...(cat === "none"
      ? { categoryId: null }
      : cat
        ? { category: { slug: cat } }
        : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [products, categories, totalCount, noneCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        variants: { select: { stock: true } },
      },
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, categoryId: null } }),
  ]);

  // Stock real: suma de variantes si las hay; si no, el stock del producto.
  const stockOf = (p: (typeof products)[number]) =>
    p.variants.length > 0
      ? p.variants.reduce((n, v) => n + v.stock, 0)
      : p.stock;

  // Construye enlaces del filtro conservando la búsqueda.
  const mkHref = (nextCat: string | null) => {
    const sp = new URLSearchParams();
    if (nextCat) sp.set("cat", nextCat);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  };

  const hasFilter = Boolean(cat || q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">
            {totalCount} producto{totalCount === 1 ? "" : "s"} en tu catálogo.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Búsqueda */}
      <form method="get" className="flex gap-2 sm:max-w-sm">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar producto por nombre…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Buscar
        </button>
      </form>

      {/* Filtro por categoría */}
      <div className="flex flex-wrap gap-2">
        <Pill href={mkHref(null)} active={!cat}>
          Todos <Count>{totalCount}</Count>
        </Pill>
        {categories.map((c) => (
          <Pill key={c.id} href={mkHref(c.slug)} active={cat === c.slug}>
            {c.name} <Count>{c._count.products}</Count>
          </Pill>
        ))}
        {noneCount > 0 && (
          <Pill href={mkHref("none")} active={cat === "none"}>
            Sin categoría <Count>{noneCount}</Count>
          </Pill>
        )}
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">
            {hasFilter
              ? "No hay productos que coincidan con el filtro."
              : "Todavía no tienes productos."}
          </p>
          {hasFilter ? (
            <Link
              href="/admin/products"
              className="mt-3 inline-block text-sm font-medium text-gray-900 underline"
            >
              Quitar filtros
            </Link>
          ) : (
            <Link
              href="/admin/products/new"
              className="mt-3 inline-block text-sm font-medium text-gray-900 underline"
            >
              Añade el primero
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imageUrl || "https://placehold.co/48x48?text=%20"}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 rounded-md object-cover"
                      />
                      <span className="font-medium text-gray-900">
                        {p.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {isOnSale(p) ? (
                      <span className="flex flex-col">
                        <span className="font-medium text-red-600">
                          {formatPrice(p.salePriceCents!, store.currency)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(p.priceCents, store.currency)}
                        </span>
                      </span>
                    ) : (
                      formatPrice(p.priceCents, store.currency)
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{stockOf(p)}</td>
                  <td className="px-4 py-3">
                    {p.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Publicado
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Oculto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pill({
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 text-gray-600 hover:border-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-black/10 px-1.5 text-xs">{children}</span>
  );
}
