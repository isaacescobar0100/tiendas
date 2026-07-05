"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createStoreAction, type ActionState } from "../../actions";

export default function NewStorePage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createStoreAction,
    undefined,
  );

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/superadmin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Nueva tienda</h1>
      <p className="mb-6 text-sm text-gray-500">
        Crea la tienda y su usuario administrador.
      </p>

      <form
        action={formAction}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-900">
            Datos de la tienda
          </legend>
          <Field
            label="Nombre de la tienda"
            name="storeName"
            placeholder="Zapatería Central"
            required
          />
          <Field
            label="Moneda (ISO 3 letras)"
            name="currency"
            placeholder="COP"
            defaultValue="COP"
          />
        </fieldset>

        <fieldset className="space-y-4 border-t border-gray-100 pt-6">
          <legend className="text-sm font-semibold text-gray-900">
            Administrador de la tienda
          </legend>
          <Field
            label="Nombre"
            name="adminName"
            placeholder="Ana Pérez"
            required
          />
          <Field
            label="Email"
            name="adminEmail"
            type="email"
            placeholder="ana@zapateria.com"
            required
          />
          <Field
            label="Contraseña"
            name="adminPassword"
            type="password"
            placeholder="mínimo 6 caracteres"
            required
          />
        </fieldset>

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
          {pending ? "Creando…" : "Crear tienda"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
    </div>
  );
}
