// Reconoce el subdominio de una tienda: surenos.<STORE_ROOT_DOMAIN>.
// Sin dependencias de servidor: lo usan el middleware (proxy.ts) y las páginas.
import { isReservedSlug } from "@/lib/utils";

/** Dominio puente configurado (p. ej. "acordemusic.com"), o "" si no hay. */
export function rootDomain(): string {
  return (process.env.STORE_ROOT_DOMAIN ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "");
}

/** Subdominio de la tienda en el dominio puente (surenos.acordemusic.com), o null. */
export function storeSubdomain(slug: string): string | null {
  const root = rootDomain();
  return root ? `${slug}.${root}` : null;
}

/** Host sin puerto y en minúsculas. */
export const cleanHost = (host: string) => host.split(":")[0].toLowerCase();

/**
 * Dirección propia del panel de la plataforma (superadmin), p. ej.
 * "panel.acordemusic.com". Nunca se toma como tienda. "" si no hay.
 */
export function platformHost(): string {
  // Acepta "panel.midominio.com" o una URL completa ("https://panel.midominio.com/").
  let v = (process.env.PLATFORM_HOST ?? "").trim();
  const scheme = v.indexOf("://");
  if (scheme >= 0) v = v.slice(scheme + 3);
  return cleanHost(v.split("/")[0]);
}

export function isPlatformHost(host: string): boolean {
  const p = platformHost();
  return !!p && cleanHost(host) === p;
}

/** Slug de tienda si el host es <slug>.<dominio raíz>; si no, null. */
export function subdomainSlug(host: string): string | null {
  const root = rootDomain();
  if (!root) return null;
  const h = cleanHost(host);
  if (h === root || !h.endsWith(`.${root}`) || isPlatformHost(h)) return null;
  const sub = h.slice(0, -(root.length + 1));
  // Un solo nivel, formato de slug y nunca un nombre reservado (admin, api,
  // sede…): así un subdominio no puede saltarse la protección de los paneles.
  if (sub === "www" || !/^[a-z0-9-]+$/.test(sub) || isReservedSlug(sub)) {
    return null;
  }
  return sub;
}

/** El propio dominio raíz (o www): se comporta como el dominio principal. */
export function isRootHost(host: string): boolean {
  const root = rootDomain();
  const h = cleanHost(host);
  return !!root && (h === root || h === `www.${root}`);
}

/** Dominio técnico de la plataforma (Vercel o local): nunca es una tienda. */
export function isMainHost(host: string): boolean {
  return (
    !host ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  );
}

/** Cabecera interna que el middleware pone cuando la visita llega por el
 * subdominio o dominio propio de una tienda (valor = slug). El middleware
 * siempre la sobrescribe o la borra: el navegador no puede fijarla. */
export const STORE_HOST_HEADER = "x-store-host";
