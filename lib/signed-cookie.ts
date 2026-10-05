// Firma y verificación de cookies propias (cliente, sede, impersonación).
// - Usa el mismo secreto que NextAuth (AUTH_SECRET o NEXTAUTH_SECRET).
// - En producción falla si no hay secreto, en vez de usar uno conocido.
// - Cada tipo de cookie usa su propia clave derivada, así un token de un tipo
//   nunca vale como otro.
import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Valores de ejemplo que nunca deben usarse como secreto real.
const PLACEHOLDERS = new Set([
  "genera-uno-con: openssl rand -base64 32",
  "dev-secret-change-me",
]);

function baseSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (s.length >= 16 && !PLACEHOLDERS.has(s)) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET no está configurado (o es el valor de ejemplo). Defínelo en las variables de entorno.",
    );
  }
  return "solo-desarrollo-no-usar-en-produccion";
}

function key(purpose: string): Buffer {
  return createHmac("sha256", baseSecret()).update(`cookie:${purpose}`).digest();
}

function mac(purpose: string, payload: string): string {
  return createHmac("sha256", key(purpose)).update(payload).digest("base64url");
}

/** Devuelve `payload.firma` con el objeto serializado en base64url. */
export function signPayload(purpose: string, data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${mac(purpose, payload)}`;
}

/** Verifica firma y caducidad (`exp` en ms). Devuelve el objeto o null. */
export function verifyPayload<T extends { exp: number }>(
  purpose: string,
  token: string | undefined,
): T | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(purpose, payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Como signPayload, pero cifrado (AES-256-GCM): el contenido no se puede leer
 * ni alterar. Para datos que no deben verse en la página (p. ej. el id de un
 * pedido dentro de una URL).
 */
export function sealPayload(purpose: string, data: object): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(`seal:${purpose}`), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

/** Abre un sealPayload y verifica su caducidad (`exp` en ms). Null si no vale. */
export function openPayload<T extends { exp: number }>(purpose: string, token: string | undefined | null): T | null {
  if (!token || token.length > 500) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", key(`seal:${purpose}`), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString()) as T;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: maxAgeSeconds,
  path: "/",
});
