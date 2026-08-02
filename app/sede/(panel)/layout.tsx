import { redirect } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { getCurrentSede } from "@/lib/sede-auth";
import { SedeNav } from "@/components/sede-nav";
import { sedeLogoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SedePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {sede.store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sede.store.logoUrl}
                alt={sede.store.name}
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                <Store className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">
                {sede.store.name}
              </p>
              <p className="truncate text-xs text-gray-400">{sede.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SedeNav />
            <form action={sedeLogoutAction}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
