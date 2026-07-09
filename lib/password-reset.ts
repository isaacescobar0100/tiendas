import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

// Token de un solo uso, válido 1 hora. Se guarda solo su hash (SHA-256).
const TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

type Target =
  | { kind: "admin"; userId: string }
  | { kind: "customer"; customerId: string };

/** Crea un token de reseteo y devuelve el valor en claro (para el enlace). */
export async function createResetToken(target: Target): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(raw),
      kind: target.kind,
      userId: target.kind === "admin" ? target.userId : null,
      customerId: target.kind === "customer" ? target.customerId : null,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return raw;
}

/** Devuelve el token válido (no usado, no expirado) o null. */
export async function findValidToken(raw: string) {
  if (!raw) return null;
  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!rec || rec.usedAt || rec.expiresAt.getTime() < Date.now()) return null;
  return rec;
}

export async function markTokenUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
