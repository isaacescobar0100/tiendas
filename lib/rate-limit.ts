import "server-only";
import { headers } from "next/headers";

// Limitador de peticiones en memoria (ventana fija por clave).
//
// AVISO: en Vercel (serverless) cada instancia tiene su propia memoria, así que
// esto es una defensa "mejor esfuerzo" contra fuerza bruta y abuso puntual, no
// un límite global exacto. Contra ataques grandes (millones de peticiones) la
// defensa correcta es el firewall/WAF de la plataforma (Vercel Firewall).

type Hit = { count: number; reset: number };
const store = new Map<string, Hit>();

// Limpieza ocasional para no crecer sin límite.
function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.reset < now) store.delete(k);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const hit = store.get(key);
  if (!hit || hit.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  hit.count += 1;
  if (hit.count > limit) {
    return { ok: false, retryAfter: Math.ceil((hit.reset - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** IP del cliente a partir de las cabeceras del proxy (Vercel). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconocida";
}

/** IP del cliente a partir de un Request (route handlers). */
export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
