import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    storeId?: string | null;
    storeSlug?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      storeId: string | null;
      storeSlug: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    storeId: string | null;
    storeSlug: string | null;
  }
}
