// Sesión de una SEDE (punto de venta). Cookie httpOnly firmada con HMAC-SHA256.
// Separada del admin/superadmin y del cliente. La sede ve solo sus pedidos.
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE = "sede_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function setSedeSession(locationId: string) {
  const payload = Buffer.from(
    JSON.stringify({ locationId, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSedeSession() {
  (await cookies()).delete(COOKIE);
}

async function getSedeSession(): Promise<string | null> {
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
    if (!data.exp || data.exp < Date.now() || !data.locationId) return null;
    return data.locationId as string;
  } catch {
    return null;
  }
}

/** Sede actual (con su tienda) si hay sesión válida; si no, null. */
export async function getCurrentSede() {
  const locationId = await getSedeSession();
  if (!locationId) return null;
  const sede = await prisma.storeLocation.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      storeId: true,
      store: {
        select: { name: true, slug: true, currency: true, logoUrl: true },
      },
    },
  });
  return sede;
}
