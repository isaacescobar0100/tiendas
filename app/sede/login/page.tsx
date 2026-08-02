"use client";

import { useActionState } from "react";
import { Store } from "lucide-react";
import { sedeLoginAction, type SedeLoginState } from "../actions";

export default function SedeLoginPage() {
  const [state, formAction, pending] = useActionState<SedeLoginState, FormData>(
    sedeLoginAction,
    undefined,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold text-gray-900">
          <Store className="h-6 w-6" />
          Acceso de sede
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-gray-900">
            Entrar a tu sede
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Verás solo los pedidos de tu sede.
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Correo de la sede
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                placeholder="lasnieves@tienda.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                placeholder="••••••••"
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
              {pending ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          ¿No tienes acceso? Pídeselo al administrador de la tienda.
        </p>
      </div>
    </main>
  );
}
