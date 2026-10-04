"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createStoreAction, type ActionState } from "../../actions";
import { keepFormSubmit } from "@/components/keep-form";
import { StoreConfigFields, newStoreDefaults, inputCls, labelCls } from "../store-config-fields";

// Crear tienda: la MISMA configuración que «Configurar tienda» (dominio, SEO,
// pagos, plan y sedes, Wompi) más su administrador. Todo queda listo de una vez.
export default function NewStorePage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createStoreAction,
    undefined,
  );

  return (
    <div className="mx-auto max-w-lg">
      <Link
        prefetch={false}
        href="/superadmin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Nueva tienda</h1>
      <p className="mb-6 text-sm text-gray-500">
        Crea la tienda ya configurada (plan, sedes, pagos, dominio y Google) y su usuario administrador.
      </p>

      <form
        onSubmit={keepFormSubmit(formAction)}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <StoreConfigFields store={newStoreDefaults()} isNew />

        <fieldset className="space-y-4 border-t border-gray-100 pt-6">
          <legend className="text-sm font-semibold text-gray-900">Administrador de la tienda</legend>
          <div>
            <label className={labelCls}>Nombre</label>
            <input name="adminName" placeholder="Ana Pérez" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input name="adminEmail" type="email" placeholder="ana@tienda.com" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contraseña</label>
            <input name="adminPassword" type="password" placeholder="mínimo 8 caracteres" required className={inputCls} autoComplete="new-password" />
          </div>
        </fieldset>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
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
