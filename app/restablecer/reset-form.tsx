"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, KeyRound, Lock } from "lucide-react";
import { resetAdminPasswordAction, type ResetState } from "../recuperar/actions";
import { AuthHeading, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetAdminPasswordAction,
    undefined,
  );
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  // Requisitos visibles mientras escribe (el servidor vuelve a validar).
  const rules = [
    { ok: pw.length >= 8, text: "Al menos 8 caracteres" },
    { ok: pw.length > 0 && pw === confirm, text: "Las dos contraseñas coinciden" },
  ];

  return (
    <>
      <AuthHeading title="Crea una contraseña nueva" subtitle="Elige una que no uses en otros sitios." />
      {!token ? (
        <Notice kind="error">
          Falta el enlace. Ábrelo desde el correo que te enviamos o{" "}
          <Link prefetch={false} href="/recuperar" className="font-semibold underline">
            pide uno nuevo
          </Link>
          .
        </Notice>
      ) : (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <PasswordField
            id="password"
            name="password"
            label="Nueva contraseña"
            icon={Lock}
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <PasswordField
            id="confirm"
            name="confirm"
            label="Repite la contraseña"
            icon={KeyRound}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <ul className="space-y-1.5" aria-label="Requisitos">
            {rules.map((r) => (
              <li key={r.text} className={`flex items-center gap-2 text-sm ${r.ok ? "text-ok-ink" : "text-ink-3"}`}>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${r.ok ? "bg-ok text-white" : "border border-line-2"}`}
                >
                  {r.ok && <Check className="h-3 w-3" />}
                </span>
                {r.text}
              </li>
            ))}
          </ul>
          {state?.error && <Notice kind="error">{state.error}</Notice>}
          <SubmitButton pending={pending} pendingText="Guardando…">
            Guardar contraseña
          </SubmitButton>
        </form>
      )}
    </>
  );
}
