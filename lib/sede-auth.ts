// Sesión de una SEDE (punto de venta). Cookie httpOnly firmada (lib/signed-cookie).
// Separada del admin/superadmin y del cliente. La sede ve solo sus pedidos.
// La cookie lleva la versión de sesión de la sede: si el admin le cambia la clave
// o le quita el acceso, las sesiones abiertas dejan de valer.
import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signPayload, verifyPayload, cookieOptions } from "@/lib/signed-cookie";

const COOKIE = "sede_session";
const PURPOSE = "sede";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export async function setSedeSession(locationId: string, sv: number) {
  const token = signPayload(PURPOSE, {
    locationId,
    sv,
    exp: Date.now() + MAX_AGE * 1000,
  });
  (await cookies()).set(COOKIE, token, cookieOptions(MAX_AGE));
}

export async function clearSedeSession() {
  (await cookies()).delete(COOKIE);
}

/** Sede actual (con su tienda) si hay sesión válida; si no, null. */
export async function getCurrentSede() {
  const data = verifyPayload<{ locationId: string; sv: number; exp: number }>(
    PURPOSE,
    (await cookies()).get(COOKIE)?.value,
  );
  if (!data?.locationId || typeof data.sv !== "number") return null;
  const sede = await prisma.storeLocation.findUnique({
    where: { id: data.locationId },
    select: {
      id: true,
      name: true,
      storeId: true,
      email: true,
      passwordHash: true,
      sessionVersion: true,
      store: {
        select: { name: true, slug: true, currency: true, logoUrl: true },
      },
    },
  });
  // Sin acceso configurado o credenciales cambiadas → sesión inválida.
  if (!sede || !sede.email || !sede.passwordHash) return null;
  if (sede.sessionVersion !== data.sv) return null;
  return {
    id: sede.id,
    name: sede.name,
    storeId: sede.storeId,
    store: sede.store,
  };
}
