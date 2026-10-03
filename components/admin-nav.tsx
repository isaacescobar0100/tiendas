"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/session-actions";
import { ADMIN_MENU, isActiveGroup, isActiveLink, type MenuGroup } from "@/lib/admin-menu";

// Menú del panel agrupado en secciones desplegables (Pedidos, Catálogo, Mi
// tienda, Ajustes). Panel privado: los enlaces no hacen prefetch (cada uno
// sería un render dinámico con sesión y base de datos).
export function AdminNav({ storeSlug }: { storeSlug: string }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Cerrar desplegables y menú al cambiar de página.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpenGroup(null);
    setDrawer(false);
  }

  // Escape cierra; clic fuera cierra el desplegable de escritorio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setDrawer(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const topCls = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition ${
      active ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
    }`;

  return (
    <>
      {/* ── Escritorio: grupos con desplegable ── */}
      <nav ref={navRef} aria-label="Menú del panel" className="hidden items-center gap-1 whitespace-nowrap text-sm lg:flex">
        {ADMIN_MENU.map((g) =>
          g.href ? (
            <Link
              key={g.label}
              href={g.href}
              prefetch={false}
              aria-current={isActiveGroup(pathname, g) ? "page" : undefined}
              className={topCls(isActiveGroup(pathname, g))}
            >
              {g.label}
            </Link>
          ) : (
            <div key={g.label} className="relative">
              <button
                type="button"
                aria-expanded={openGroup === g.label}
                aria-haspopup="true"
                onClick={() => setOpenGroup((o) => (o === g.label ? null : g.label))}
                className={topCls(isActiveGroup(pathname, g))}
              >
                {g.label}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${openGroup === g.label ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {openGroup === g.label && (
                <div className="absolute left-0 top-full z-40 mt-2 min-w-52 rounded-xl bg-surface p-1.5 shadow-xl ring-1 ring-line">
                  {g.items!.map((l) => {
                    const active = isActiveLink(pathname, l);
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          active ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ),
        )}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <Link
          href={`/${storeSlug}`}
          prefetch={false}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Ver tienda <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <form action={signOutAction}>
          <button className="rounded-lg px-2.5 py-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </nav>

      {/* ── Celular: botón y panel lateral con acordeones ── */}
      <button
        type="button"
        onClick={() => setDrawer((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-2 text-ink-2 lg:hidden"
        aria-label="Abrir menú"
        aria-expanded={drawer}
      >
        {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? "" : "pointer-events-none"}`} inert={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawer ? "opacity-100" : "opacity-0"}`}
        />
        <nav
          aria-label="Menú del panel"
          className={`absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-surface shadow-xl transition-transform ${
            drawer ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-semibold text-ink">Menú</span>
            <button type="button" onClick={() => setDrawer(false)} className="text-ink-3 hover:text-ink" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto p-2">
            {ADMIN_MENU.map((g) => (
              <DrawerGroup key={g.label} group={g} pathname={pathname} />
            ))}
            <Link
              href={`/${storeSlug}`}
              prefetch={false}
              target="_blank"
              className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-ink-2 hover:bg-surface-2"
            >
              Ver tienda <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <form action={signOutAction} className="mt-auto border-t border-line pt-2">
              <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-3 hover:bg-surface-2">
                Cerrar sesión
              </button>
            </form>
          </div>
        </nav>
      </div>
    </>
  );
}

// Grupo del menú del celular: acordeón (abierto si contiene la página actual).
function DrawerGroup({ group: g, pathname }: { group: MenuGroup; pathname: string }) {
  const active = isActiveGroup(pathname, g);
  const [open, setOpen] = useState(active);
  if (g.href) {
    return (
      <Link
        href={g.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-3 py-2.5 text-sm ${active ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-2 hover:bg-surface-2"}`}
      >
        {g.label}
      </Link>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${active ? "font-semibold text-ink" : "text-ink-2"} hover:bg-surface-2`}
      >
        {g.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="mb-1 ml-3 border-l border-line pl-2">
          {g.items!.map((l) => {
            const on = isActiveLink(pathname, l);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                aria-current={on ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm ${on ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-2 hover:bg-surface-2"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
