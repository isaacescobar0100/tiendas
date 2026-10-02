// Bloqueo por intentos fallidos (3 → 15 min), compartido por los logins de
// admin, cliente y sede. El contador se incrementa con una sola sentencia SQL
// atómica: peticiones simultáneas no pueden "perder" intentos ni borrar un
// bloqueo recién puesto.
import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MAX_ATTEMPTS = 3;
export const LOCK_MIN = 15;

// Solo estas tablas (nombres fijos, nunca vienen del usuario).
const TABLE = {
  user: Prisma.raw('"User"'),
  customer: Prisma.raw('"Customer"'),
  sede: Prisma.raw('"StoreLocation"'),
} as const;
export type LockKind = keyof typeof TABLE;

/** ¿La cuenta está bloqueada ahora mismo? */
export async function isLocked(kind: LockKind, id: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ locked: boolean }[]>(
    Prisma.sql`SELECT ("lockedUntil" IS NOT NULL AND "lockedUntil" > now()) AS locked
               FROM ${TABLE[kind]} WHERE id = ${id}`,
  );
  return rows[0]?.locked ?? false;
}

/** Suma un intento fallido; bloquea al llegar al máximo. */
export async function registerFailure(kind: LockKind, id: string): Promise<void> {
  // Si un bloqueo anterior ya expiró, el conteo empieza de nuevo.
  const rows = await prisma.$queryRaw<{ failedAttempts: number }[]>(
    Prisma.sql`UPDATE ${TABLE[kind]}
               SET "failedAttempts" = CASE WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= now()
                                           THEN 1 ELSE "failedAttempts" + 1 END,
                   "lockedUntil" = CASE WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= now()
                                        THEN NULL ELSE "lockedUntil" END
               WHERE id = ${id}
               RETURNING "failedAttempts"`,
  );
  if ((rows[0]?.failedAttempts ?? 0) >= MAX_ATTEMPTS) {
    await prisma.$executeRaw(
      Prisma.sql`UPDATE ${TABLE[kind]}
                 SET "lockedUntil" = now() + make_interval(mins => ${LOCK_MIN}::int),
                     "failedAttempts" = 0
                 WHERE id = ${id}`,
    );
  }
}

/** Login correcto: limpia el conteo. */
export async function clearFailures(kind: LockKind, id: string): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE ${TABLE[kind]} SET "failedAttempts" = 0, "lockedUntil" = NULL
               WHERE id = ${id} AND ("failedAttempts" <> 0 OR "lockedUntil" IS NOT NULL)`,
  );
}

// Hash fijo para comparar cuando el usuario no existe: así la respuesta tarda
// lo mismo y no revela si el email tiene cuenta.
export const DUMMY_HASH =
  "$2b$10$lqI3WubbpX.drqulXjmLwOp2Syh8KAyb7fzlcf1DYakpzr2aRQ6vS";
