import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Store, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStoreOpenState } from "@/lib/store-hours";
import { isAgeRestricted } from "@/lib/store-type";
import { AgeGate } from "@/components/age-gate";
import { CartProvider } from "@/components/cart/cart-context";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { FavoritesProvider } from "@/components/favorites/favorites-context";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { StoreUnavailable } from "@/components/store-unavailable";
import { AccountMenu } from "./cuenta/account-menu";

export default async function StoreLayout({
  params,
  children,
}: {
  params: Promise<{ storeSlug: string }>;
  children: React.ReactNode;
}) {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      active: true,
      currency: true,
      logoUrl: true,
      themeColor: true,
      surveyUrl: true,
      whatsapp: true,
      shippingCents: true,
      freeShippingOverCents: true,
      hoursJson: true,
    },
  });
  if (!store) {
    // ¿Es un slug antiguo? Redirige al actual conservando el resto de la ruta.
    const alias = await prisma.storeSlugAlias.findUnique({
      where: { slug: storeSlug },
      select: { store: { select: { slug: true } } },
    });
    if (alias?.store) {
      const path = (await headers()).get("x-pathname") ?? `/${storeSlug}`;
      const prefix = `/${storeSlug}`;
      const rest = path.startsWith(prefix) ? path.slice(prefix.length) : "";
      redirect(`/${alias.store.slug}${rest}`);
    }
    notFound();
  }

  // Tienda desactivada: página de mantenimiento (no renderizamos la tienda).
  if (!store.active) {
    return (
      <StoreUnavailable
        name={store.name}
        logoUrl={store.logoUrl}
        themeColor={store.themeColor}
      />
    );
  }

  const customer = await getCurrentCustomer(store.id);
  const openState = getStoreOpenState(store.hoursJson);

  return (
    <FavoritesProvider storeSlug={store.slug} customerId={customer?.id ?? null}>
    <CartProvider
      storeSlug={store.slug}
      customerId={customer?.id ?? null}
      currency={store.currency}
      shippingCents={store.shippingCents}
      freeShippingOverCents={store.freeShippingOverCents}
      storeClosed={openState.enforced && !openState.isOpen}
    >
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
              <AccountMenu
                storeSlug={store.slug}
                customerName={customer?.name ?? null}
              />
              <CartButton />
            </div>
          </div>
        </header>

        {openState.enforced && !openState.isOpen && (
          <div className="border-b border-amber-200 bg-amber-50">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-amber-800">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Cerrado ahora
                {openState.message ? ` · ${openState.message}` : ""}
              </span>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href={`/${store.slug}/rastrear`}
              className="font-medium text-gray-500 hover:text-gray-900"
            >
              Rastrear pedido
            </Link>
            <Link
              href={`/${store.slug}/legal/terminos`}
              className="text-gray-500 hover:text-gray-900"
            >
              Términos y condiciones
            </Link>
            <Link
              href={`/${store.slug}/legal/privacidad`}
              className="text-gray-500 hover:text-gray-900"
            >
              Política de privacidad
            </Link>
            {store.surveyUrl && (
              <a
                href={store.surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-500 hover:text-gray-900"
              >
                Encuesta de satisfacción
              </a>
            )}
          </nav>
          <div className="mt-2">{store.name} · con tecnología de MiTienda</div>
        </footer>
      </div>
      <CartDrawer />
      {isAgeRestricted(store.type) && (
        <AgeGate storeSlug={store.slug} storeName={store.name} />
      )}
      </div>
    </CartProvider>
    </FavoritesProvider>
  );
}
