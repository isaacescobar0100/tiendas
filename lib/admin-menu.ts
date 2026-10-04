// Menú del panel de admin agrupado en secciones desplegables. Lo usan la barra
// superior (escritorio), el menú del celular y el submenú de Ajustes.

export type MenuLink = { href: string; label: string; exact?: boolean };
export type MenuGroup = { label: string; href?: string; items?: MenuLink[] };

export const SETTINGS_LINKS: MenuLink[] = [
  { href: "/admin/settings", label: "General", exact: true },
  { href: "/admin/settings/portada", label: "Portada" },
  { href: "/admin/settings/envios", label: "Envíos" },
  { href: "/admin/settings/horario", label: "Horario" },
  { href: "/admin/settings/pagos", label: "Pagos" },
  { href: "/admin/settings/avisos", label: "Avisos" },
  { href: "/admin/settings/cuenta", label: "Cuenta y contraseña" },
];

export const ADMIN_MENU: MenuGroup[] = [
  { label: "Inicio", href: "/admin" },
  {
    label: "Pedidos",
    items: [
      { href: "/admin/orders", label: "Pedidos" },
      { href: "/admin/exportar", label: "Exportar" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/products", label: "Productos" },
      { href: "/admin/categories", label: "Categorías" },
      { href: "/admin/promotions", label: "Promociones (banner)" },
      { href: "/admin/descuentos", label: "Descuentos %" },
      { href: "/admin/reviews", label: "Reseñas" },
    ],
  },
  {
    label: "Mi tienda",
    items: [
      { href: "/admin/apariencia", label: "Apariencia" },
      { href: "/admin/menu-qr", label: "Menú QR" },
      { href: "/admin/sedes", label: "Sedes" },
    ],
  },
  { label: "Ajustes", items: SETTINGS_LINKS },
];

/** ¿La ruta actual corresponde a este enlace? */
export function isActiveLink(pathname: string, l: MenuLink): boolean {
  if (l.href === "/admin") return pathname === "/admin";
  if (l.exact) return pathname === l.href;
  return pathname === l.href || pathname.startsWith(`${l.href}/`);
}

/** ¿Algún enlace del grupo está activo? */
export function isActiveGroup(pathname: string, g: MenuGroup): boolean {
  if (g.href) return isActiveLink(pathname, { href: g.href, label: g.label });
  return (g.items ?? []).some((l) => isActiveLink(pathname, l));
}
