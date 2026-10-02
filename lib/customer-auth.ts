// Sesión de cliente de la tienda (separada del login de admin/superadmin).
// Cookie httpOnly firmada (ver lib/signed-cookie). Incluye la versión de sesión
// del cliente: al recuperar la contraseña se incrementa y las cookies viejas dejan
// de valer.
import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signPayload, verifyPayload, cookieOptions } from "@/lib/signed-cookie";

const COOKIE = "customer_session";
const PURPOSE = "customer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export type CustomerSession = {
  customerId: string;
  storeId: string;
  sv: number;
};

/** Crea la cookie de sesión del cliente. Llamar solo desde server actions. */
export async function setCustomerSession(session: CustomerSession) {
  const token = signPayload(PURPOSE, {
    ...session,
    exp: Date.now() + MAX_AGE * 1000,
  });
  (await cookies()).set(COOKIE, token, cookieOptions(MAX_AGE));
}

export async function clearCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** Lee y verifica la sesión desde la cookie. Devuelve null si no válida. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const data = verifyPayload<CustomerSession & { exp: number }>(
    PURPOSE,
    (await cookies()).get(COOKIE)?.value,
  );
  if (!data?.customerId || !data.storeId || typeof data.sv !== "number") {
    return null;
  }
  return { customerId: data.customerId, storeId: data.storeId, sv: data.sv };
}

/** Cliente actual si hay sesión válida para esta tienda; si no, null. */
export async function getCurrentCustomer(storeId: string) {
  const session = await getCustomerSession();
  if (!session || session.storeId !== storeId) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      storeId: true,
      emailVerifiedAt: true,
      sessionVersion: true,
    },
  });
  if (!customer || customer.storeId !== storeId) return null;
  // Contraseña cambiada después de iniciar esta sesión → ya no vale.
  if (customer.sessionVersion !== session.sv) return null;
  return customer;
}
