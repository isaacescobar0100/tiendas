"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Un único mensaje para todo fallo: no revela si el email existe ni si
      // la cuenta está bloqueada (el bloqueo lo aplica `authorize`).
      return {
        error:
          "Email o contraseña incorrectos. Tras varios intentos fallidos la cuenta se bloquea 15 minutos; puedes recuperar tu contraseña.",
      };
    }
    // signIn lanza un redirect internamente; hay que re-lanzarlo
    throw error;
  }
}
