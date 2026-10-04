"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { updateStoreConfigAction, type ActionState } from "../../../actions";
import { keepFormSubmit } from "@/components/keep-form";
import { StoreConfigFields, type StoreCfg } from "../../store-config-fields";

export function EditStoreForm({ store }: { store: StoreCfg }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateStoreConfigAction,
    undefined,
  );

  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <input type="hidden" name="storeId" value={store.id} />
      <StoreConfigFields store={store} isNew={false} />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check className="h-4 w-4" /> Cambios guardados
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
