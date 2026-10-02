import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isReservedSlug } from "@/lib/utils";

const { auth } = NextAuth(authConfig);

// ─── Dominios propios → tienda ───────────────────────────────────────────────
// Mapea yoswill.com → /yoswill (URL limpia). Para el dominio principal
// (*.vercel.app / localhost) no hace nada. Falla-abierto: nunca rompe.

const domainCache = new Map<string, { slug: string | null; exp: number }>();

function isMainHost(host: string): boolean {
  return (
    !host ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  );
}

/** El propio dominio raíz (o www): se comporta como el dominio principal. */
function isRootHost(host: string): boolean {
  const h = host.split(":")[0];
  return !!ROOT_DOMAIN && (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`);
}

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

// ─── Subdominio por tienda: surenos.<STORE_ROOT_DOMAIN> → /surenos ───────────
// STORE_ROOT_DOMAIN es el dominio "puente" (p. ej. acordemusic.com, luego
// idhetech.com). En Vercel se añade el comodín *.<dominio> al proyecto.
const ROOT_DOMAIN = (process.env.STORE_ROOT_DOMAIN ?? "")
  .trim()
  .toLowerCase()
  .replace(/^\.+/, "");

/** Slug de tienda si el host es <slug>.<dominio raíz>; si no, null. */
function subdomainSlug(host: string): string | null {
  if (!ROOT_DOMAIN) return null;
  const h = host.split(":")[0];
  if (h === ROOT_DOMAIN || !h.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const sub = h.slice(0, -(ROOT_DOMAIN.length + 1));
  // Un solo nivel, formato de slug y nunca un nombre reservado (admin, api,
  // sede…): así un subdominio no puede saltarse la protección de los paneles.
  if (sub === "www" || !/^[a-z0-9-]+$/.test(sub) || isReservedSlug(sub)) {
    return null;
  }
  return sub;
}

// Rutas de la plataforma que nunca se reescriben a una tienda.
const PLATFORM_PATHS =
  /^\/(admin|superadmin|api|login|recuperar|restablecer|sede|_next|favicon|sitemap|robots|\.well-known)(\/|$)/;

async function mapCustomDomain(req: NextRequest): Promise<NextResponse | null> {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const fromSubdomain = subdomainSlug(host);
  if (!fromSubdomain && (isMainHost(host) || isRootHost(host))) return null;

  const { pathname } = req.nextUrl;
  if (PLATFORM_PATHS.test(pathname)) return null;

  const slug = fromSubdomain ?? (await resolveSlug(host, req.nextUrl.origin));
  if (!slug) return null;
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) return null;

  const url = req.nextUrl.clone();
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export default auth(async (req) => {
  // 1) Dominio propio → reescribe a /slug (antes de la auth).
  const rewrite = await mapCustomDomain(req);
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
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", nextUrl.pathname);
  return NextResponse.next({ request: { headers: reqHeaders } });
});

export const config = {
  // Ejecuta el middleware en todo salvo assets estáticos y la API de auth
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
