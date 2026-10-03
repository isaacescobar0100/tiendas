"use client";

import { Suspense, useActionState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  resetCustomerPasswordAction,
  type ResetState,
} from "../reset-actions";

export default function CustomerResetPage() {
  return (
    <Suspense>
      <CustomerResetForm />
    </Suspense>
  );
}

function CustomerResetForm() {
  const storeSlug = String(useParams().storeSlug ?? "");
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetCustomerPasswordAction,
    undefined,
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-ink">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-ink-3">
        Escribe tu contraseña (mínimo 8 caracteres).
      </p>

      <div className="mt-6">
        {!token ? (
          <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
            Falta el enlace. Ábrelo desde el correo que te enviamos.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-2">
                Nueva contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-2">
                Repite la contraseña
              </label>
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
