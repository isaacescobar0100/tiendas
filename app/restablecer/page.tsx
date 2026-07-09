"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { resetAdminPasswordAction, type ResetState } from "../recuperar/actions";

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetAdminPasswordAction,
    undefined,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-gray-900"
        >
          <ShoppingBag className="h-6 w-6" />
          MiTienda
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-gray-900">
            Nueva contraseña
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Escribe tu nueva contraseña.
          </p>

          {!token ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              Falta el enlace. Ábrelo desde el correo que te enviamos.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
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
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {pending ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
