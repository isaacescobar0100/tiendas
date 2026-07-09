"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/session-actions";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/promotions", label: "Promociones" },
  { href: "/admin/exportar", label: "Exportar" },
  { href: "/admin/settings", label: "Ajustes" },
];

export function AdminNav({ storeSlug }: { storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  // Cierra el panel con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Escritorio */}
      <nav className="hidden items-center gap-5 text-sm sm:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              isActive(l.href)
                ? "font-medium text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }
          >
            {l.label}
          </Link>
        ))}
        <Link
          href={`/${storeSlug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          Ver tienda <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <form action={signOutAction}>
          <button className="text-sm text-gray-500 transition hover:text-gray-900">
            Cerrar sesión
          </button>
        </form>
      </nav>

      {/* Botón hamburguesa (móvil) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 sm:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Panel lateral (móvil) */}
      <div
        className={`fixed inset-0 z-50 sm:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Fondo */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <nav
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="font-semibold text-gray-900">Menú</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-900"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto p-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  isActive(l.href)
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={`/${storeSlug}`}
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Ver tienda <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <form
              action={signOutAction}
              className="mt-auto border-t border-gray-100 pt-2"
            >
              <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50">
                Cerrar sesión
              </button>
            </form>
          </div>
        </nav>
      </div>
    </>
  );
}
