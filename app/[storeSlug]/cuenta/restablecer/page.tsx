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
      <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
      <p className="mt-1 text-sm text-gray-500">Escribe tu nueva contraseña.</p>

      <div className="mt-6">
        {!token ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Falta el enlace. Ábrelo desde el correo que te enviamos.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Repite la contraseña
              </label>
              <input
                name="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
