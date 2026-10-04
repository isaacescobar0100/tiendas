import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getImpersonatedStoreId } from "@/lib/impersonation";

/**
 * Usuario (admin/superadmin) de la sesión, comprobado contra la BD: el usuario
 * debe existir y su versión de sesión debe coincidir con la del token. Así un
 * cambio de contraseña, un reseteo o borrar la cuenta cierran las sesiones
 * abiertas. El rol se toma de la BD, no del token.
 */
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.user.sv) return null;
  return user;
}

/** Exige sesión de SUPERADMIN o redirige. */
export async function requireSuperadmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPERADMIN") redirect("/admin");
  return user;
}

/**
 * Exige sesión de ADMIN y devuelve su tienda (fresca desde la BD).
 * Redirige si no hay sesión, no es admin, o aún no tiene tienda asignada.
 */
export async function requireAdminStore() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Superadmin en modo "entrar a la tienda": trabaja sobre la tienda impersonada.
  if (user.role === "SUPERADMIN") {
    const storeId = await getImpersonatedStoreId(user.id);
    if (!storeId) redirect("/superadmin");
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) redirect("/superadmin");
    return { user, store, impersonating: true };
  }

  if (user.role !== "ADMIN") redirect("/superadmin");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) redirect("/login?error=sin-tienda");

  return { user, store, impersonating: false };
}

/**
 * Tienda del admin de la sesión, sin redirigir (para APIs que responden 401).
 * Incluye al superadmin cuando está dentro de una tienda.
 */
export async function getAdminStoreId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "SUPERADMIN") return getImpersonatedStoreId(user.id);
  if (user.role !== "ADMIN") return null;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  return store?.id ?? null;
}
