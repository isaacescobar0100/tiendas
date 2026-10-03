"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { AuthHeading, Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <>
      <AuthHeading title="Bienvenido de nuevo" subtitle="Entra a tu panel de administración." />
      <form action={formAction} className="space-y-5">
        {(params.get("changed") || params.get("reset")) && (
          <Notice kind="success">
            Contraseña actualizada. Por seguridad cerramos las sesiones abiertas: entra con tu
            nueva contraseña.
          </Notice>
        )}
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field
          id="email"
          name="email"
          type="email"
          label="Correo"
          icon={Mail}
          required
          autoFocus
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
        />
        <PasswordField
          id="password"
          name="password"
          label="Contraseña"
          icon={Lock}
          required
          autoComplete="current-password"
          placeholder="Tu contraseña"
          aside={
            <Link prefetch={false} href="/recuperar" className="text-sm font-medium text-brand-text hover:underline">
              ¿La olvidaste?
            </Link>
          }
        />
        {state?.error && <Notice kind="error">{state.error}</Notice>}
        <SubmitButton pending={pending} pendingText="Entrando…">
          Entrar
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-ink-3">
        ¿Trabajas en una sede?{" "}
        <Link prefetch={false} href="/sede/login" className="font-semibold text-brand-text hover:underline">
          Entra a tu sede
        </Link>
      </p>
    </>
  );
}
