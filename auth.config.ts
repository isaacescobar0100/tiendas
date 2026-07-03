import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Configuración base compatible con Edge (sin Prisma ni bcrypt).
// El provider de credenciales se añade en auth.ts (entorno Node).
export const authConfig = {
  // Confía en el host de despliegue (necesario en Vercel/producción)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Copia rol y tienda al token en el login y los expone en la sesión.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.storeId = user.storeId ?? null;
        token.storeSlug = user.storeSlug ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.storeId = (token.storeId as string | null) ?? null;
        session.user.storeSlug = (token.storeSlug as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
