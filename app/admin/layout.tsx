import Link from "next/link";
import { requireAdminStore } from "@/lib/guards";
import { AdminNav } from "@/components/admin-nav";
import { stopImpersonationAction } from "@/app/superadmin/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store, impersonating } = await requireAdminStore();

  // Aviso de renta (solo tiendas de renta con fecha de pago).
  let rentBanner: { text: string; danger: boolean } | null = null;
  if (store.plan === "RENT" && store.paidUntil) {
    const days = Math.ceil(
      (store.paidUntil.getTime() - Date.now()) / 86400000,
    );
    if (days < 0) {
      rentBanner = {
        text: "Tu plan está vencido. Renueva el pago para no perder el acceso a tu tienda.",
        danger: true,
      };
    } else if (days <= 3) {
      rentBanner = {
        text: `Tu plan vence ${days === 0 ? "hoy" : `en ${days} día${days === 1 ? "" : "s"}`}. Renueva a tiempo para no perder el acceso.`,
        danger: false,
      };
    }
  }

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
      <header className="relative border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
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
