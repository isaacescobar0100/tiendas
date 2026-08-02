"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { updateStoreConfigAction, type ActionState } from "../../../actions";

type StoreCfg = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  plan: "SALE" | "RENT";
  paidUntil: string; // YYYY-MM-DD o ""
  onlinePaymentEnabled: boolean;
  codEnabled: boolean;
  wompiPublicKey: string | null;
  wompiPrivateKey: string | null;
  wompiIntegritySecret: string | null;
  wompiEventsSecret: string | null;
};

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";

export function EditStoreForm({ store }: { store: StoreCfg }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateStoreConfigAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <input type="hidden" name="storeId" value={store.id} />

      {/* URL y dominio */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Datos de la tienda
        </legend>
        <div>
          <label className={labelCls}>Nombre de la tienda</label>
          <input
            name="storeName"
            defaultValue={store.name}
            required
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">
            Lo edita solo el superadmin (el admin no puede cambiarlo).
          </p>
        </div>
        <div>
          <label className={labelCls}>URL corta (slug)</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-400">/</span>
            <input
              name="slug"
              defaultValue={store.slug}
              required
              className={inputCls}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            La tienda se verá en <code>tu-dominio/&lt;slug&gt;</code>. Cambiarlo
            modifica el enlace actual.
          </p>
        </div>
        <div>
          <label className={labelCls}>Dominio propio (opcional)</label>
          <input
            name="customDomain"
            defaultValue={store.customDomain ?? ""}
            placeholder="yoswill.com"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">
            Escribe solo el dominio (sin https:// ni /ruta). Recuerda añadirlo
            también en Vercel → Domains para que funcione.
          </p>
        </div>
      </fieldset>

      {/* Métodos de pago */}
      <fieldset className="space-y-3 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">
          Métodos de pago (en la tienda)
        </legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="onlinePayment"
            defaultChecked={store.onlinePaymentEnabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          Pago en línea (Wompi)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="codPayment"
            defaultChecked={store.codEnabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          Contra entrega / coordinado (sin pasarela)
        </label>
        <p className="text-xs text-gray-400">
          Debe quedar al menos uno activo. Para negocios que cobran por
          transferencia/WhatsApp, deja solo &ldquo;Contra entrega&rdquo;.
        </p>
      </fieldset>

      {/* Cobro */}
      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">
          Cobro (plan de la tienda)
        </legend>
        <div>
          <label className={labelCls}>Tipo</label>
          <select
            name="plan"
            defaultValue={store.plan}
            className={inputCls}
          >
            <option value="SALE">Venta única (es del cliente)</option>
            <option value="RENT">Renta (pago recurrente)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Pagada hasta (solo renta)</label>
          <input
            type="date"
            name="paidUntil"
            defaultValue={store.paidUntil}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">
            El panel te avisará cuando esté vencida. También puedes usar
            &ldquo;Renovar +1 mes&rdquo; desde la lista de tiendas.
          </p>
        </div>
      </fieldset>

      {/* Llaves de Wompi */}
      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">
          Pagos en línea (Wompi) de esta tienda
        </legend>
        <p className="-mt-2 text-xs text-gray-400">
          Cada tienda cobra a su propia cuenta de Wompi. Si lo dejas vacío, se
          usan las llaves de prueba del entorno.
        </p>
        <div>
          <label className={labelCls}>Llave pública</label>
          <input
            name="wompiPublicKey"
            defaultValue={store.wompiPublicKey ?? ""}
            placeholder="pub_prod_..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Llave privada</label>
          <input
            name="wompiPrivateKey"
            defaultValue={store.wompiPrivateKey ?? ""}
            placeholder="prv_prod_..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Secreto de integridad</label>
          <input
            name="wompiIntegritySecret"
            defaultValue={store.wompiIntegritySecret ?? ""}
            placeholder="prod_integrity_..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Secreto de eventos (webhook)</label>
          <input
            name="wompiEventsSecret"
            defaultValue={store.wompiEventsSecret ?? ""}
            placeholder="prod_events_..."
            className={inputCls}
          />
        </div>
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
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
