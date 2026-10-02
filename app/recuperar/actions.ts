"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createResetToken,
  findValidToken,
  consumeToken,
  invalidateOtherTokens,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/site-url";

export type ResetState = { error?: string; ok?: boolean } | undefined;

// Solicitar el enlace de reseteo (admin/superadmin).
export async function requestAdminResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const rl = await rateLimit(`reset-req:${await clientIp()}`, 5, 15 * 60 * 1000);
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
    // El enlace usa la URL configurada del sitio, nunca cabeceras de la
    // petición (Host / X-Forwarded-Host las puede falsear quien la envía).
    const url = `${getBaseUrl()}/restablecer?token=${encodeURIComponent(token)}`;
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
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
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

  // Consume el token de forma atómica (no se puede usar dos veces a la vez).
  if (!(await consumeToken(rec.id))) {
    return { error: "El enlace no es válido o ya caducó. Solicita uno nuevo." };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: rec.userId },
    // Cierra todas las sesiones abiertas de la cuenta.
    data: {
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  await invalidateOtherTokens({ userId: rec.userId });
  redirect("/login?reset=1");
}
