// Sesión de cliente de la tienda (separada del login de admin/superadmin).
// Cookie httpOnly firmada con HMAC-SHA256 usando AUTH_SECRET. Sin dependencias.
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE = "customer_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export type CustomerSession = { customerId: string; storeId: string };

/** Crea la cookie de sesión del cliente. Llamar solo desde server actions. */
export async function setCustomerSession(session: CustomerSession) {
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** Lee y verifica la sesión desde la cookie. Devuelve null si no válida. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.customerId || !data.storeId) return null;
    return { customerId: data.customerId, storeId: data.storeId };
  } catch {
    return null;
  }
}

/** Cliente actual si hay sesión válida para esta tienda; si no, null. */
export async function getCurrentCustomer(storeId: string) {
  const session = await getCustomerSession();
  if (!session || session.storeId !== storeId) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { id: true, name: true, email: true, storeId: true },
  });
  if (!customer || customer.storeId !== storeId) return null;
  return customer;
}
