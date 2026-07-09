// "Entrar a la tienda": el superadmin ve el panel de un admin sin su clave.
// Cookie httpOnly firmada con HMAC-SHA256. Solo la usa el superadmin.
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE = "sa_impersonate";
const MAX_AGE = 60 * 60 * 8; // 8 horas

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export async function setImpersonation(storeId: string) {
  const token = `${storeId}.${sign(storeId)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearImpersonation() {
  (await cookies()).delete(COOKIE);
}

/** Devuelve el storeId impersonado si la firma es válida; si no, null. */
export async function getImpersonatedStoreId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const storeId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(storeId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return storeId || null;
}
