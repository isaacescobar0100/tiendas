import type { Metadata } from "next";
import Link from "next/link";
import { storeIcons } from "@/lib/store-meta";
import { requireAdminStore } from "@/lib/guards";
import { billingOf, GRACE_DAYS } from "@/lib/billing";
import { TZ } from "@/lib/dates";
import { storeTheme, themeStyle } from "@/lib/theme";
import { themeFontVars } from "@/lib/fonts";
import { AdminNav } from "@/components/admin-nav";
import { LiveRefresh } from "@/components/live-refresh";
import { stopImpersonationAction } from "@/app/superadmin/actions";

// Pestaña del panel: "Pedidos · Admin SUREÑOS CLUB" con el logo de la tienda.
export async function generateMetadata(): Promise<Metadata> {
  const { store } = await requireAdminStore();
  return {
    title: { absolute: `Admin · ${store.name}`, template: `%s · Admin ${store.name}` },
    icons: storeIcons(store.logoUrl),
    robots: { index: false },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store, impersonating } = await requireAdminStore();

  // Aviso de vencimiento del plan (anual o mensual).
  const billing = billingOf(store);
  const fecha = store.paidUntil
    ? new Intl.DateTimeFormat("es", {
        timeZone: TZ,
        dateStyle: "long",
      }).format(store.paidUntil)
    : "";
  const days = billing.days ?? 0;
  const rentBanner: { text: string; danger: boolean } | null =
    billing.status === "suspended"
      ? {
          text: `Tu tienda está suspendida: el plan venció el ${fecha}. Tus clientes no pueden ver ni comprar. Renueva para reactivarla.`,
          danger: true,
        }
      : billing.status === "grace"
        ? {
            text: `Tu plan venció el ${fecha}. Tienes ${GRACE_DAYS + days + 1} día${GRACE_DAYS + days + 1 === 1 ? "" : "s"} antes de que la tienda se suspenda. Renueva el pago.`,
            danger: true,
          }
        : billing.status === "soon"
          ? {
              text: `Tu plan vence ${days === 0 ? "hoy" : `en ${days} día${days === 1 ? "" : "s"}`} (${fecha}). Renueva a tiempo para no perder el acceso.`,
              danger: false,
            }
          : null;

  // El panel usa la apariencia de la tienda (Admin > Apariencia): mismos
  // colores, modo claro/oscuro y tipografía que su tienda.
  return (
    <div className={`store-theme ${themeFontVars} min-h-screen bg-bg`} style={themeStyle(storeTheme(store))}>
      <div className="h-1 bg-brand print:hidden" aria-hidden />
      {rentBanner && (
        <div
          className={`px-4 py-2 text-center text-sm font-medium ${
            rentBanner.danger ? "bg-bad text-white" : "bg-warn-soft text-warn-ink"
          }`}
        >
          {rentBanner.text}
        </div>
      )}
      {impersonating && (
        <div className="flex items-center justify-center gap-3 bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn-ink">
          <span>
            Estás viendo <strong>{store.name}</strong> como superadmin.
          </span>
          <form action={stopImpersonationAction}>
            <button className="rounded-md bg-surface px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line hover:bg-surface-2">
              Salir
            </button>
          </form>
        </div>
      )}
      <header className="relative border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <Link
              prefetch={false}
              href="/admin"
              className="flex min-w-0 items-center gap-2.5 font-semibold text-ink"
            >
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-ink">
                  {store.name.slice(0, 1)}
                </span>
              )}
              <span className="max-w-[11rem] truncate">{store.name}</span>
            </Link>
            <span className="hidden shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-text sm:inline">
              Admin
            </span>
          </div>
          <AdminNav storeSlug={store.slug} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      {/* Tiempo real: los pedidos se actualizan solos y uno nuevo suena en
          cualquier pantalla del panel (la lista solo se refresca en Inicio y Pedidos). */}
      <LiveRefresh
        src="/api/live?scope=admin"
        alertNew
        ordersHref="/admin/orders"
        refreshPattern="^/admin(/orders(/.*)?)?$"
      />
    </div>
  );
}
