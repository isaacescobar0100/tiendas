// URL base absoluta del sitio, para SEO (metadata, Open Graph, sitemap).
// Prioridad: dominio propio configurado → URL de Vercel → localhost.
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Dirección pública de una tienda, en orden de preferencia:
 * dominio propio (surenos.com) SOLO si ya está activo (comprobado) →
 * subdominio del dominio puente (surenos.<STORE_ROOT_DOMAIN>) → dominio
 * principal con la ruta (/surenos). Así un dominio recién escrito pero aún
 * sin configurar no rompe los enlaces ni el SEO.
 * Solo en el servidor (lee variables de entorno).
 */
export function storePublicUrl(store: {
  slug: string;
  customDomain?: string | null;
  domainActive?: boolean | null;
}): string {
  if (store.customDomain && store.domainActive) return `https://${store.customDomain}`;
  const root = (process.env.STORE_ROOT_DOMAIN ?? "").trim().toLowerCase();
  if (root) return `https://${store.slug}.${root}`;
  return `${getBaseUrl()}/${store.slug}`;
}
