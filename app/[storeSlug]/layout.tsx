import Link from "next/link";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CartProvider } from "@/components/cart/cart-context";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FavoritesProvider } from "@/components/favorites/favorites-context";
import { FavoritesLink } from "@/components/favorites/favorites-link";

export default async function StoreLayout({
  params,
  children,
}: {
  params: Promise<{ storeSlug: string }>;
  children: React.ReactNode;
}) {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: {
      name: true,
      slug: true,
      currency: true,
      logoUrl: true,
      themeColor: true,
    },
  });
  if (!store) notFound();

  return (
    <FavoritesProvider storeSlug={store.slug}>
    <CartProvider storeSlug={store.slug} currency={store.currency}>
      {/* --brand: color de marca de la tienda, usado por botones y acentos */}
      <div
        className="contents"
        style={{ ["--brand" as string]: store.themeColor }}
      >
      <div className="flex min-h-screen flex-col bg-white">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href={`/${store.slug}`}
                className="flex items-center gap-2 font-bold text-gray-900"
              >
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
                    <Store className="h-4 w-4" />
                  </span>
                )}
                {store.name}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden text-sm text-gray-400 hover:text-gray-600 sm:inline"
              >
                Todas las tiendas
              </Link>
              <FavoritesLink storeSlug={store.slug} />
              <CartButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
          <Link
            href={`/${store.slug}/rastrear`}
            className="font-medium text-gray-500 hover:text-gray-900"
          >
            Rastrear pedido
          </Link>
          <div className="mt-1">{store.name} · con tecnología de MiTienda</div>
        </footer>
      </div>
      <CartDrawer />
      </div>
    </CartProvider>
    </FavoritesProvider>
  );
}
