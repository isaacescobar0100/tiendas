"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { sendVerifyLinkAction, type AccountState } from "./actions";

// Cuenta sin correo verificado: no mostramos pedidos hasta que use el enlace.
export function VerifyEmailNotice({
  storeSlug,
  email,
}: {
  storeSlug: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    sendVerifyLinkAction,
    undefined,
  );

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-amber-900">
        <MailCheck className="h-5 w-5" />
        <p className="font-semibold">Confirma tu correo para ver tus pedidos</p>
      </div>
      <p className="mt-1 text-sm text-amber-800">
        Por seguridad, mostramos los pedidos solo cuando confirmas que{" "}
        <strong>{email}</strong> es tuyo. Te enviamos un enlace para hacerlo.
      </p>
      <form action={formAction} className="mt-3">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        {state?.ok ? (
          <p className="text-sm text-green-700">
            Listo, revisa tu correo (y la carpeta de spam).
          </p>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviarme el enlace"}
          </button>
        )}
        {state?.error && (
          <p className="mt-2 text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </div>
  );
}
