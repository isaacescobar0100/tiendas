"use client";

import { useActionState } from "react";
import { changeMyPasswordAction } from "../actions";
import type { ActionState } from "../actions";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changeMyPasswordAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <Field
        label="Contraseña actual"
        name="currentPassword"
        autoComplete="current-password"
      />
      <Field
        label="Nueva contraseña"
        name="newPassword"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres. Usa algo único que no uses en otro sitio."
      />
      <Field
        label="Repite la nueva contraseña"
        name="confirmPassword"
        autoComplete="new-password"
      />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✅ Contraseña actualizada. Úsala la próxima vez que inicies sesión.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="password"
        required
        {...props}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
