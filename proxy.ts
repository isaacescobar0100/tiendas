import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import {
  subdomainSlug,
  isRootHost,
  isPlatformHost,
  platformHost,
  cleanHost,
  isMainHost,
  STORE_HOST_HEADER,
} from "@/lib/store-host";

const { auth } = NextAuth(authConfig);

// ─── Host de una tienda → URL limpia ─────────────────────────────────────────
// - Subdominio: surenos.<STORE_ROOT_DOMAIN>/cart → página /surenos/cart.
// - Dominio propio (guardado en la tienda): yoswill.com/cart → /yoswill/cart.
// En el dominio principal (*.vercel.app / localhost) no hace nada.

const domainCache = new Map<string, { slug: string | null; exp: number }>();

async function resolveSlug(
  host: string,
  origin: string,
): Promise<string | null> {
  const hit = domainCache.get(host);
  if (hit && hit.exp > Date.now()) return hit.slug;
  try {
    const res = await fetch(
      `${origin}/api/resolve-domain?host=${encodeURIComponent(host)}`,
      { headers: { "x-mw": "1" } },
    );
    const data = (await res.json()) as { slug: string | null };
    // Tope de tamaño: el Host lo envía el cliente y no debe crecer sin límite.
    if (domainCache.size > 500) domainCache.clear();
    domainCache.set(host, { slug: data.slug, exp: Date.now() + 60_000 });
    return data.slug;
  } catch {
    return null;
  }
}

// Dominio propio ACTIVO de una tienda (por su slug), con caché de 1 minuto.
const movedCache = new Map<string, { domain: string | null; exp: number }>();
async function activeDomainOf(slug: string, origin: string): Promise<string | null> {
  const hit = movedCache.get(slug);
  if (hit && hit.exp > Date.now()) return hit.domain;
  try {
    const res = await fetch(`${origin}/api/resolve-domain?slug=${encodeURIComponent(slug)}`, { headers: { "x-mw": "1" } });
    const data = (await res.json()) as { domain: string | null };
    if (movedCache.size > 500) movedCache.clear();
    movedCache.set(slug, { domain: data.domain, exp: Date.now() + 60_000 });
    return data.domain;
  } catch {
    return null;
  }
}

/**
 * Tienda que ya estrenó dominio propio: su subdominio (surenos.dominio-puente)
 * redirige para siempre (301) a ese dominio con la misma ruta. Así Google pasa
 * todo al dominio nuevo y los QR o enlaces viejos siguen funcionando. Solo en
 * visitas (GET/HEAD): nunca se redirige un envío de formulario.
 */
async function redirectToOwnDomain(req: NextRequest): Promise<NextResponse | null> {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  const slug = subdomainSlug(cleanHost(req.headers.get("host") ?? ""));
  if (!slug) return null;
  const domain = await activeDomainOf(slug, req.nextUrl.origin);
  if (!domain) return null;
  return NextResponse.redirect(`https://${domain}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
}

// Rutas de la plataforma que nunca se reescriben a una tienda.
const PLATFORM_PATHS =
  /^\/(admin|superadmin|api|login|recuperar|restablecer|sede|_next|favicon|sitemap|robots|\.well-known)(\/|$)/;

/** Slug de la tienda dueña de este host (subdominio o dominio propio). */
async function storeOfHost(req: NextRequest): Promise<string | null> {
  const host = cleanHost(req.headers.get("host") ?? "");
  const fromSubdomain = subdomainSlug(host);
  if (fromSubdomain) return fromSubdomain;
  if (isMainHost(host) || isRootHost(host) || isPlatformHost(host)) return null;
  return resolveSlug(host, req.nextUrl.origin);
}

/** Cabeceras de la petición sin la marca interna (el navegador no la fija). */
function cleanRequestHeaders(req: NextRequest): Headers {
  const h = new Headers(req.headers);
  h.delete(STORE_HOST_HEADER);
  return h;
}

async function mapStoreHost(req: NextRequest): Promise<NextResponse | null> {
  const { pathname, search } = req.nextUrl;
  if (PLATFORM_PATHS.test(pathname)) return null;
  const slug = await storeOfHost(req);
  if (!slug) return null;

  // Direcciones viejas con el slug (/surenos/cart) → la limpia (/cart).
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(slug.length + 1) || "/";
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
  const headers = cleanRequestHeaders(req);
  headers.set(STORE_HOST_HEADER, slug);
  headers.set("x-pathname", url.pathname);
  headers.set("x-search", search);
  return NextResponse.rewrite(url, { request: { headers } });
}

export default auth(async (req) => {
  // 0) Con la plataforma en su propia dirección (PLATFORM_HOST), el
  //    superadmin no se abre desde la dirección de una tienda: se lleva allá.
  const p = req.nextUrl.pathname;
  const ph = platformHost();
  if (ph && (p === "/superadmin" || p.startsWith("/superadmin/")) && (await storeOfHost(req))) {
    return NextResponse.redirect(`https://${ph}${p}${req.nextUrl.search}`, 307);
  }

  // 1) Subdominio de una tienda con dominio propio activo → al dominio.
  const moved = await redirectToOwnDomain(req);
  if (moved) return moved;

  // 2) Host de una tienda → reescribe a /slug (antes de la auth).
  const rewrite = await mapStoreHost(req);
  if (rewrite) return rewrite;

  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;
  const isLoggedIn = !!session;

  const path = nextUrl.pathname;
  const isSuperadminArea = path.startsWith("/superadmin");
  const isAdminArea = path.startsWith("/admin");
  const isLoginPage = path === "/login";

  // Usuario autenticado que entra al login -> lo mandamos a su panel
  if (isLoginPage && isLoggedIn) {
    const dest = role === "SUPERADMIN" ? "/superadmin" : "/admin";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // Áreas protegidas: requieren sesión
  if ((isSuperadminArea || isAdminArea) && !isLoggedIn) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Control por rol
  if (isSuperadminArea && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }
  if (isAdminArea && role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/superadmin", nextUrl));
  }
  // El superadmin solo entra a /admin si está "impersonando" una tienda; de eso
  // se encarga requireAdminStore (redirige a /superadmin si no lo está).

  // Expone la ruta a los server components (para redirigir slugs antiguos).
  const reqHeaders = cleanRequestHeaders(req);
  reqHeaders.set("x-pathname", nextUrl.pathname);
  reqHeaders.set("x-search", nextUrl.search);
  return NextResponse.next({ request: { headers: reqHeaders } });
});

export const config = {
  // Ejecuta el middleware en todo salvo assets estáticos y la API de auth
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
