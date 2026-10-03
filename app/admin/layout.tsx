import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { billingOf, GRACE_DAYS } from "@/lib/billing";
import { storeTheme, themeTokens } from "@/lib/theme";
import { AdminNav } from "@/components/admin-nav";
import { stopImpersonationAction } from "@/app/superadmin/actions";

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
        timeZone: "America/Bogota",
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

  // Acento de la marca en el panel (neutro): solo las variables de marca,
  // calculadas sobre el fondo blanco del admin para que siempre se lean.
  const brandTokens = themeTokens({
    ...storeTheme(store),
    bg: "#ffffff",
    surface: "#ffffff",
    ink: "#111827",
    mode: "light",
  });
  const accent = Object.fromEntries(
    ["--brand", "--brand-ink", "--brand-hover", "--brand-soft", "--brand-text"].map((k) => [k, brandTokens[k]]),
  ) as React.CSSProperties;

  return (
    <div className="min-h-screen bg-gray-50" style={accent}>
      <div className="h-1 bg-brand print:hidden" aria-hidden />
      {rentBanner && (
        <div
          className={`px-4 py-2 text-center text-sm font-medium text-white ${
            rentBanner.danger ? "bg-red-600" : "bg-amber-500"
          }`}
        >
          {rentBanner.text}
        </div>
      )}
      {impersonating && (
        <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          <span>
            Estás viendo <strong>{store.name}</strong> como superadmin.
          </span>
          <form action={stopImpersonationAction}>
            <button className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
              Salir
            </button>
          </form>
        </div>
      )}
      <header className="relative border-b border-gray-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              prefetch={false}
              href="/admin"
              className="flex min-w-0 items-center gap-2.5 font-semibold text-gray-900"
            >
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-ink">
                  {store.name.slice(0, 1)}
                </span>
              )}
              <span className="truncate">{store.name}</span>
            </Link>
            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-text">
              Admin
            </span>
          </div>
          <AdminNav storeSlug={store.slug} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
