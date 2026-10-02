// Rutas de la tienda sin repetir el slug cuando se visita por su propio
// subdominio o dominio (surenos.acordemusic.com/cart) y con el slug en el
// dominio principal (miapp.vercel.app/surenos/cart). Solo servidor.
import "server-only";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/site-url";
import { STORE_HOST_HEADER, subdomainSlug, cleanHost } from "@/lib/store-host";

/** Prefijo de rutas de la tienda: "" en su propio host, "/slug" si no. */
export async function storeBasePath(slug: string): Promise<string> {
  const h = await headers();
  return h.get(STORE_HOST_HEADER) === slug ? "" : `/${slug}`;
}

/** Une el prefijo con una ruta de la tienda ("/cart", "?cat=x", ""). */
export function joinStorePath(base: string, path = ""): string {
  const out = `${base}${path}`;
  if (!out) return "/";
  return out.startsWith("/") ? out : `/${out}`;
}

/** Ruta completa de la tienda para redirecciones del servidor. */
export async function storeHref(slug: string, path = ""): Promise<string> {
  return joinStorePath(await storeBasePath(slug), path);
}

/**
 * URL absoluta de la tienda para correos y retornos de pago. Usa el host de la
 * visita SOLO si está comprobado que es de esta tienda (su subdominio o su
 * dominio propio guardado en la BD); si no, el dominio principal con /slug.
 */
export async function storeOrigin(store: {
  slug: string;
  customDomain?: string | null;
}): Promise<string> {
  const host = cleanHost((await headers()).get("host") ?? "");
  const own =
    !!host &&
    (subdomainSlug(host) === store.slug ||
      (!!store.customDomain && host === store.customDomain.toLowerCase()));
  return own ? `https://${host}` : `${getBaseUrl()}/${store.slug}`;
}
