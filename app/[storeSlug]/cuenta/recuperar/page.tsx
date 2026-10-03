"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  requestCustomerResetAction,
  type ResetState,
} from "../reset-actions";
import { useStoreHref } from "@/components/store-base";
import { keepFormSubmit } from "@/components/keep-form";

export default function CustomerRecoverPage() {
  const sh = useStoreHref();
  const storeSlug = String(useParams().storeSlug ?? "");
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestCustomerResetAction,
    undefined,
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-ink">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-ink-3">
        Te enviaremos un enlace a tu correo para crear una nueva.
      </p>

      <div className="mt-6">
        {state?.ok ? (
          <div className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok-ink">
            Si ese correo tiene una cuenta, te enviamos un enlace para
            restablecer la contraseña. Revisa tu bandeja (y spam).
          </div>
        ) : (
          <form onSubmit={keepFormSubmit(formAction)} className="space-y-4">
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-2">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
              {pending ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-sm">
        <Link
          href={sh(`/cuenta`)}
          className="text-ink-3 hover:text-ink"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
