"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { requestAdminResetAction, type ResetState } from "./actions";

export default function RecoverPage() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestAdminResetAction,
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
            Recuperar contraseña
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Te enviaremos un enlace a tu correo para crear una nueva.
          </p>

          {state?.ok ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Si ese correo tiene una cuenta, te enviamos un enlace para
              restablecer la contraseña. Revisa tu bandeja (y spam).
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
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
                {pending ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-900">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
