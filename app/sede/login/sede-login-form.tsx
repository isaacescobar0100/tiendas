"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { sedeLoginAction, type SedeLoginState } from "../actions";
import { AuthHeading, Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

export function SedeLoginForm() {
  const [state, formAction, pending] = useActionState<SedeLoginState, FormData>(
    sedeLoginAction,
    undefined,
  );

  return (
    <>
      <AuthHeading title="Entra a tu sede" subtitle="Verás y atenderás solo los pedidos de tu sede." />
      <form action={formAction} className="space-y-5">
        <Field
          id="email"
          name="email"
          type="email"
          label="Correo de la sede"
          icon={Mail}
          required
          autoFocus
          autoComplete="email"
          inputMode="email"
          placeholder="sede@tutienda.com"
        />
        <PasswordField
          id="password"
          name="password"
          label="Contraseña"
          icon={Lock}
          required
          autoComplete="current-password"
          placeholder="Tu contraseña"
        />
        {state?.error && <Notice kind="error">{state.error}</Notice>}
        <SubmitButton pending={pending} pendingText="Entrando…">
          Entrar
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-ink-3">
        ¿No tienes acceso o olvidaste la clave? Pídesela al administrador de la tienda.
      </p>
      <p className="mt-2 text-center text-sm text-ink-3">
        ¿Eres el administrador?{" "}
        <Link prefetch={false} href="/login" className="font-semibold text-brand-text hover:underline">
          Entra aquí
        </Link>
      </p>
    </>
  );
}
