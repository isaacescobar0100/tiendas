"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createResetToken,
  findValidToken,
  markTokenUsed,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type ResetState = { error?: string; ok?: boolean } | undefined;

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Solicitar el enlace de reseteo (admin/superadmin).
export async function requestAdminResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const rl = rateLimit(`reset-req:${await clientIp()}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return { error: `Demasiadas solicitudes. Espera ${rl.retryAfter}s.` };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Indica tu email." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createResetToken({ kind: "admin", userId: user.id });
    const url = `${await baseUrl()}/restablecer?token=${token}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name ?? "",
      resetUrl: url,
      brandName: "MiTienda",
    });
  }
  // No revelamos si el email existe o no.
  return { ok: true };
}

const pwSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

// Guardar la nueva contraseña con un token válido (admin).
export async function resetAdminPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const parsed = pwSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rec = await findValidToken(token);
  if (!rec || rec.kind !== "admin" || !rec.userId) {
    return { error: "El enlace no es válido o ya caducó. Solicita uno nuevo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: rec.userId },
    data: { passwordHash, failedAttempts: 0, lockedUntil: null },
  });
  await markTokenUsed(rec.id);
  redirect("/login?reset=1");
}
