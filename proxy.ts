import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
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
  if (isAdminArea && role !== "ADMIN") {
    // Un superadmin no gestiona un catálogo concreto: lo llevamos a su panel
    return NextResponse.redirect(new URL("/superadmin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Ejecuta el middleware en todo salvo assets estáticos y la API de auth
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
