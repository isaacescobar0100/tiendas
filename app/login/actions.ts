"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string } | undefined;

const MAX_ATTEMPTS = 3;

function lockedMessage(lockedUntil: Date): string {
  const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
  return `Cuenta bloqueada por seguridad. Inténtalo en ${mins} min.`;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");
  const emailNorm = email.trim().toLowerCase();

  // Si la cuenta ya está bloqueada, avisamos antes de intentar entrar.
  const before = emailNorm
    ? await prisma.user.findUnique({ where: { email: emailNorm } })
    : null;
  if (before?.lockedUntil && before.lockedUntil.getTime() > Date.now()) {
    return { error: lockedMessage(before.lockedUntil) };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Releemos el estado: `authorize` ya contó el intento / bloqueó.
      const after = emailNorm
        ? await prisma.user.findUnique({ where: { email: emailNorm } })
        : null;
      if (after?.lockedUntil && after.lockedUntil.getTime() > Date.now()) {
        return {
          error: `Demasiados intentos. ${lockedMessage(after.lockedUntil)}`,
        };
      }
      const left = after ? Math.max(0, MAX_ATTEMPTS - after.failedAttempts) : 0;
      if (after && left > 0) {
        return {
          error: `Email o contraseña incorrectos. Te queda${left === 1 ? "" : "n"} ${left} intento${left === 1 ? "" : "s"}.`,
        };
      }
      return { error: "Email o contraseña incorrectos." };
    }
    // signIn lanza un redirect internamente; hay que re-lanzarlo
    throw error;
  }
}
