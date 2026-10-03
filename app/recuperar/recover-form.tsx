"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requestAdminResetAction, type ResetState } from "./actions";
import { AuthHeading, Field, Notice, SubmitButton } from "@/components/auth/fields";
import { keepFormSubmit } from "@/components/keep-form";

export function RecoverForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestAdminResetAction,
    undefined,
  );
  // React limpia el formulario tras cada envío: el correo se conserva si falla.
  const [email, setEmail] = useState("");

  return (
    <>
      <AuthHeading
        title="¿Olvidaste tu contraseña?"
        subtitle="Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva."
      />
      {state?.ok ? (
        <Notice kind="success">
          Si ese correo tiene una cuenta, te enviamos el enlace. Revisa tu bandeja de entrada (y
          la de spam o promociones).
        </Notice>
      ) : (
        <form onSubmit={keepFormSubmit(formAction)} className="space-y-5">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {state?.error && <Notice kind="error">{state.error}</Notice>}
          <SubmitButton pending={pending} pendingText="Enviando…">
            Enviar enlace
          </SubmitButton>
        </form>
      )}
      <Link
        prefetch={false}
        href="/login"
        className="mt-8 inline-flex items-center justify-center gap-1.5 self-center text-sm font-semibold text-brand-text hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
      </Link>
    </>
  );
}
