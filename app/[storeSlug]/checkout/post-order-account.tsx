"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { registerAction, type AccountState } from "../cuenta/actions";

// Bloque en la pantalla de "¡Pedido confirmado!": invita a crear la cuenta
// con el mismo correo del pedido para poder rastrearlo (no bloquea la compra).
export function PostOrderAccount({
  storeSlug,
  name,
  email,
}: {
  storeSlug: string;
  name: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    registerAction,
    undefined,
  );

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left">
      <div className="flex items-center gap-2 text-gray-900">
        <UserPlus className="h-5 w-5 text-[var(--brand)]" />
        <h2 className="font-semibold">Crea tu cuenta para seguir tus pedidos</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Con este mismo correo verás el estado de este y futuros pedidos cuando
        quieras. Te enviaremos un enlace para crear tu contraseña.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="email" value={email} />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Correo
          </label>
          <input
            value={email}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
          />
        </div>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        {state?.ok ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Te enviamos un correo con un enlace para crear tu contraseña.
          </p>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Crear mi cuenta"}
          </button>
        )}
      </form>
    </div>
  );
}
