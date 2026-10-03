"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_LINKS, isActiveLink } from "@/lib/admin-menu";

// Submenú de Ajustes: columna a la izquierda en escritorio; fila deslizable
// arriba en el celular.
export function SettingsNav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // En el celular la fila se desliza: la sección activa queda centrada a la
  // vista (antes podía quedar cortada en el borde).
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const a = active.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    list.scrollTo({ left: list.scrollLeft + (a.left - l.left) - (l.width - a.width) / 2 });
  }, [pathname]);

  return (
    <nav aria-label="Secciones de ajustes" className="-mx-4 lg:mx-0">
      <ul ref={listRef} className="flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {SETTINGS_LINKS.map((l) => {
          const active = isActiveLink(pathname, l);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand-soft font-semibold text-brand-text"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
