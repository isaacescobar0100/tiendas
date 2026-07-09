"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  requestCustomerResetAction,
  type ResetState,
} from "../reset-actions";

export default function CustomerRecoverPage() {
  const storeSlug = String(useParams().storeSlug ?? "");
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestCustomerResetAction,
    undefined,
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-gray-500">
        Te enviaremos un enlace a tu correo para crear una nueva.
      </p>

      <div className="mt-6">
        {state?.ok ? (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Si ese correo tiene una cuenta, te enviamos un enlace para
            restablecer la contraseña. Revisa tu bandeja (y spam).
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
              {pending ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-sm">
        <Link
          href={`/${storeSlug}/cuenta`}
          className="text-gray-500 hover:text-gray-900"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
