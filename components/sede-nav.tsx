"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/sede", label: "Dashboard", exact: true },
  { href: "/sede/pedidos", label: "Pedidos", exact: false },
];

export function SedeNav() {
  const path = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? path === href : path.startsWith(href);

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            isActive(l.href, l.exact)
              ? "font-medium text-gray-900"
              : "text-gray-600 hover:text-gray-900"
          }
        >
          {l.label}
        </Link>
      ))}
      <a
        href="/api/sede/export"
        className="text-gray-600 hover:text-gray-900"
      >
        Exportar
      </a>
    </nav>
  );
}
