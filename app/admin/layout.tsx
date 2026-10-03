import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { billingOf, GRACE_DAYS } from "@/lib/billing";
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex min-w-0 items-center gap-2">
            <Link
              prefetch={false}
              href="/admin"
              className="truncate font-semibold text-gray-900"
            >
              {store.name}
            </Link>
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
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
