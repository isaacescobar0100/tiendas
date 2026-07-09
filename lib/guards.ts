import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getImpersonatedStoreId } from "@/lib/impersonation";

/** Exige sesión de SUPERADMIN o redirige. */
export async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPERADMIN") redirect("/admin");
  return session.user;
}

/**
 * Exige sesión de ADMIN y devuelve su tienda (fresca desde la BD).
 * Redirige si no hay sesión, no es admin, o aún no tiene tienda asignada.
 */
export async function requireAdminStore() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Superadmin en modo "entrar a la tienda": trabaja sobre la tienda impersonada.
  if (session.user.role === "SUPERADMIN") {
    const storeId = await getImpersonatedStoreId();
    if (!storeId) redirect("/superadmin");
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) redirect("/superadmin");
    return { user: session.user, store, impersonating: true };
  }

  if (session.user.role !== "ADMIN") redirect("/superadmin");

  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!store) redirect("/login?error=sin-tienda");

  return { user: session.user, store, impersonating: false };
}
