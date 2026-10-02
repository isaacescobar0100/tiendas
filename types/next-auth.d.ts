import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    storeId?: string | null;
    storeSlug?: string | null;
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      storeId: string | null;
      storeSlug: string | null;
      // Versión de sesión del usuario al iniciar sesión (ver lib/guards).
      sv: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    storeId: string | null;
    storeSlug: string | null;
    sv?: number;
  }
}
