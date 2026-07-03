import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stores = await prisma.store.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShoppingBag className="h-5 w-5" />
            MiTienda
          </span>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Acceder
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Todas las tiendas, un solo lugar.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-500">
          Explora las tiendas de nuestra plataforma y descubre sus productos.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Tiendas ({stores.length})
        </h2>

        {stores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            Aún no hay tiendas publicadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/${store.slug}`}
                className="group rounded-2xl border border-gray-200 p-6 transition hover:border-gray-900 hover:shadow-sm"
              >
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="mb-3 h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 group-hover:underline">
                  {store.name}
                </h3>
                {store.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {store.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  {store._count.products} producto
                  {store._count.products === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        MiTienda — Plataforma multi-tienda
      </footer>
    </div>
  );
}
