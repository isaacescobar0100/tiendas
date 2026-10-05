import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { storeIcons } from "@/lib/store-meta";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Store, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isSuspended } from "@/lib/billing";
import { storeTheme, themeStyle } from "@/lib/theme";
import { themeFontVars } from "@/lib/fonts";
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
import { StoreBaseProvider } from "@/components/store-base";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { aboutIsLive, parseAbout } from "@/lib/about";

// cache(): la pestaña (metadata) y el layout la piden en el mismo render.
const getLayoutStore = cache((slug: string) =>
  prisma.store.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      active: true,
      currency: true,
      logoUrl: true,
      themeColor: true,
      themeBg: true,
      themeSurface: true,
      themeInk: true,
      themeMode: true,
      themeFont: true,
      surveyUrl: true,
      whatsapp: true,
      shippingCents: true,
      freeShippingOverCents: true,
      hoursJson: true,
      aboutJson: true,
      _count: { select: { locations: true } },
      plan: true,
      paidUntil: true,
    },
  }),
);

// Pestaña con el logo y el nombre de ESTA tienda en todas sus páginas.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getLayoutStore(storeSlug);
  if (!store) return {};
  return {
    title: { absolute: store.name, template: `%s · ${store.name}` },
    icons: storeIcons(store.logoUrl),
  };
}

export default async function StoreLayout({
  params,
  children,
}: {
  params: Promise<{ storeSlug: string }>;
  children: React.ReactNode;
}) {
  const { storeSlug } = await params;
  // Rutas de la tienda: sin el slug si se visita por su subdominio/dominio.
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const store = await getLayoutStore(storeSlug);
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

  // Tema de la tienda (Admin > Apariencia): variables CSS en el contenedor
  // raíz. Llegan con el HTML del servidor, así que no hay parpadeo al cargar.
  const themeCss = themeStyle(storeTheme(store));
  const themeCls = `store-theme ${themeFontVars}`;

  // Tienda desactivada o suspendida por plan vencido: página de mantenimiento
  // (no renderizamos la tienda).
  if (!store.active || isSuspended(store)) {
    return (
      <div className={themeCls} style={themeCss}>
        <StoreUnavailable name={store.name} logoUrl={store.logoUrl} />
      </div>
    );
  }

  // Menú del QR de las mesas: solo lectura, sin carrito, cuenta ni compras.
  // (x-pathname lo fija siempre el proxy; el cliente no puede falsearlo.)
  const path = (await headers()).get("x-pathname") ?? "";
  if (path === `/${store.slug}/menu`) {
    return (
      // La carta trae su propia portada: aquí solo el tema.
      <div className={`${themeCls} min-h-screen`} style={themeCss}>
        {children}
        {isAgeRestricted(store.type) && (
          <AgeGate storeSlug={store.slug} storeName={store.name} />
        )}
      </div>
    );
  }

  const customer = await getCurrentCustomer(store.id);
  const openState = getStoreOpenState(store.hoursJson);

  return (
    <StoreBaseProvider base={storeBase}>
    <FavoritesProvider storeSlug={store.slug} customerId={customer?.id ?? null}>
    <CartProvider
      storeSlug={store.slug}
      customerId={customer?.id ?? null}
      currency={store.currency}
      shippingCents={store.shippingCents}
      freeShippingOverCents={store.freeShippingOverCents}
      storeClosed={openState.enforced && !openState.isOpen}
    >
      {/* Tema de la tienda: todos los colores y fuentes salen de aquí */}
      <div className={themeCls} style={themeCss}>
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href={sh()}
                className="flex items-center gap-2 font-bold text-ink"
              >
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
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
          <div className="border-b border-warn/30 bg-warn-soft">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-warn-ink">
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

        <footer className="border-t border-line py-6 text-center text-sm text-ink-3">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {aboutIsLive(parseAbout(store.aboutJson)) && (
              <Link
                href={sh(`/nosotros`)}
                className="font-medium text-ink-3 hover:text-ink"
              >
                Conócenos
              </Link>
            )}
            {store._count.locations > 0 && (
              <Link href={sh(`/sedes`)} className="font-medium text-ink-3 hover:text-ink">
                Sedes
              </Link>
            )}
            <Link
              href={sh(`/rastrear`)}
              className="font-medium text-ink-3 hover:text-ink"
            >
              Rastrear pedido
            </Link>
            <Link
              href={sh(`/legal/terminos`)}
              className="text-ink-3 hover:text-ink"
            >
              Términos y condiciones
            </Link>
            <Link
              href={sh(`/legal/privacidad`)}
              className="text-ink-3 hover:text-ink"
            >
              Política de privacidad
            </Link>
            {store.surveyUrl && (
              <a
                href={store.surveyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-3 hover:text-ink"
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
    </StoreBaseProvider>
  );
}
