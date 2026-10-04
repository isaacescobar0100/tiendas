import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { storeIcons } from "@/lib/store-meta";
import { LogOut, Store } from "lucide-react";
import { getCurrentSede } from "@/lib/sede-auth";
import { SedeNav } from "@/components/sede-nav";
import { storeTheme, themeStyle } from "@/lib/theme";
import { themeFontVars } from "@/lib/fonts";
import { sedeLogoutAction } from "../actions";

export const dynamic = "force-dynamic";

// Pestaña del panel de sede: "Sede Las Nieves · SUREÑOS CLUB" con su logo.
export async function generateMetadata(): Promise<Metadata> {
  const sede = await getCurrentSede();
  if (!sede) return {};
  return {
    title: { default: `${sede.name} · ${sede.store.name}`, template: `%s · ${sede.name}` },
    icons: storeIcons(sede.store.logoUrl),
    robots: { index: false },
  };
}

export default async function SedePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  // El panel de la sede usa la apariencia de su tienda (Admin > Apariencia).
  return (
    <div className={`store-theme ${themeFontVars} min-h-screen bg-bg`} style={themeStyle(storeTheme(sede.store))}>
      <div className="h-1 bg-brand" aria-hidden />
      <header className="border-b border-line bg-surface">
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink">
                <Store className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {sede.store.name}
              </p>
              <p className="truncate text-xs text-ink-3">{sede.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SedeNav />
            <form action={sedeLogoutAction}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">
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
