"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/session-actions";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/settings", label: "Ajustes" },
];

export function AdminNav({ storeSlug }: { storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

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
          className="text-gray-600 hover:text-gray-900"
        >
          Ver tienda ↗
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
        <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
      </button>

      {/* Menú desplegable (móvil) */}
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default sm:hidden"
          />
          <nav className="absolute left-0 right-0 top-full z-20 flex flex-col border-b border-gray-200 bg-white p-2 shadow-lg sm:hidden">
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
              className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Ver tienda ↗
            </Link>
            <form action={signOutAction} className="border-t border-gray-100">
              <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50">
                Cerrar sesión
              </button>
            </form>
          </nav>
        </>
      )}
    </>
  );
}
