import "server-only";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Limitador de peticiones (ventana fija por clave) guardado en la base de
// datos: lo comparten todas las instancias del servidor (Vercel arranca varias
// y las reinicia), así que el límite es global y no se "resetea" cambiando de
// instancia. Cada comprobación es UNA sentencia SQL atómica.
//
// Las claves se guardan como hash SHA-256: la tabla no contiene IPs ni emails.
// Si la base no responde, se usa un límite en memoria de respaldo (para no
// tumbar el login por un fallo puntual de la base).

type Result = { ok: boolean; retryAfter: number };

const hashKey = (key: string) =>
  createHash("sha256").update(key).digest("base64url");

// ─── Respaldo en memoria (solo si la base falla) ─────────────────────────────
const memory = new Map<string, { count: number; reset: number }>();
function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  if (memory.size > 5000) memory.clear();
  const hit = memory.get(key);
  if (!hit || hit.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  hit.count += 1;
  return hit.count > limit
    ? { ok: false, retryAfter: Math.ceil((hit.reset - now) / 1000) }
    : { ok: true, retryAfter: 0 };
}

/**
 * Cuenta un intento para `key` y dice si sigue dentro del límite
 * (`limit` intentos cada `windowMs`).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<Result> {
  const k = hashKey(key);
  const seconds = Math.ceil(windowMs / 1000);
  try {
    const rows = await prisma.$queryRaw<{ count: number; retry: number }[]>(
      Prisma.sql`INSERT INTO "RateLimit" ("key", "count", "resetAt")
                 VALUES (${k}, 1, now() + make_interval(secs => ${seconds}::int))
                 ON CONFLICT ("key") DO UPDATE SET
                   "count" = CASE WHEN "RateLimit"."resetAt" <= now()
                                  THEN 1 ELSE "RateLimit"."count" + 1 END,
                   "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now()
                                    THEN now() + make_interval(secs => ${seconds}::int)
                                    ELSE "RateLimit"."resetAt" END
                 RETURNING "count",
                   GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("resetAt" - now()))))::int AS retry`,
    );
    // Limpieza ocasional de ventanas vencidas (~1 de cada 200 peticiones).
    if (Math.random() < 0.005) {
      prisma.rateLimit
        .deleteMany({ where: { resetAt: { lt: new Date() } } })
        .catch(() => {});
    }
    const row = rows[0];
    if (!row) return { ok: true, retryAfter: 0 };
    return row.count > limit
      ? { ok: false, retryAfter: Math.max(1, Number(row.retry)) }
      : { ok: true, retryAfter: 0 };
  } catch (e) {
    console.error("[rate-limit] base no disponible, uso respaldo en memoria:", e);
    return memoryLimit(k, limit, windowMs);
  }
}

// ─── IP del cliente ──────────────────────────────────────────────────────────
// En Vercel, `x-forwarded-for` lo escribe la propia plataforma con la IP real
// (el cliente no puede falsearlo). Fuera de Vercel (p. ej. un VPS con nginx),
// solo se confía en `x-real-ip`, que debe fijar el proxy propio.
function pickIp(get: (name: string) => string | null): string {
  if (process.env.VERCEL) {
    const xff = get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
  }
  const real = get("x-real-ip");
  if (real) return real.trim();
  const xff = get("x-forwarded-for");
  if (xff) {
    // Sin proxy de confianza conocido: la última IP es la que vio el proxy.
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "desconocida";
}

/** IP del cliente (server actions y páginas). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return pickIp((n) => h.get(n));
}

/** IP del cliente a partir de un Request (route handlers). */
export function clientIpFromRequest(request: Request): string {
  return pickIp((n) => request.headers.get(n));
}
