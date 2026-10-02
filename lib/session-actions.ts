"use server";

import { signOut } from "@/auth";
import { clearImpersonation } from "@/lib/impersonation";

export async function signOutAction() {
  // También se cierra el modo "entrar a la tienda" del superadmin.
  await clearImpersonation();
  await signOut({ redirectTo: "/login" });
}
