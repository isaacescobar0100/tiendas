"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  User,
  Heart,
  PackageSearch,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { useFavorites } from "@/components/favorites/favorites-context";
import { logoutAction } from "./actions";

// Menú del avatar en la cabecera de la tienda: agrupa cuenta/pedidos,
// favoritos y rastreo en un solo desplegable.
export function AccountMenu({
  storeSlug,
  customerName,
}: {
  storeSlug: string;
  customerName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { count, ready } = useFavorites();
  const showBadge = ready && count > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mi cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <User className="h-4 w-4" />
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {customerName ? customerName.split(" ")[0] : "Mi cuenta"}
        </span>
        {showBadge && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            {customerName ? (
              <>
                <p className="text-xs text-gray-400">Sesión iniciada</p>
                <p className="truncate font-semibold text-gray-900">
                  {customerName}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">No has iniciado sesión</p>
            )}
          </div>

          <nav className="py-1 text-sm">
            <MenuLink
              href={`/${storeSlug}/cuenta`}
              onClick={close}
              icon={<ClipboardList className="h-4 w-4 text-gray-400" />}
            >
              {customerName ? "Mis pedidos" : "Iniciar sesión o crear cuenta"}
            </MenuLink>
            <MenuLink
              href={`/${storeSlug}/favorites`}
              onClick={close}
              icon={<Heart className="h-4 w-4 text-gray-400" />}
            >
              <span className="flex-1">Favoritos</span>
              {showBadge && (
                <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                  {count}
                </span>
              )}
            </MenuLink>
            <MenuLink
              href={`/${storeSlug}/rastrear`}
              onClick={close}
              icon={<PackageSearch className="h-4 w-4 text-gray-400" />}
            >
              Rastrear pedido
            </MenuLink>
          </nav>

          {customerName && (
            <form action={logoutAction} className="border-t border-gray-100">
              <input type="hidden" name="storeSlug" value={storeSlug} />
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 text-gray-400" /> Cerrar sesión
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
    >
      {icon}
      {children}
    </Link>
  );
}
