"use client";

import { useActionState, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import {
  TRANSFER_KINDS,
  serializeTransferAccounts,
  type TransferAccount,
  type TransferKind,
} from "@/lib/payment-methods";
import { updatePaymentsAction, type SettingsState } from "./actions";
import { keepFormSubmit } from "@/components/keep-form";

type PaymentsData = {
  wompiReady: boolean; // el superadmin configuró las llaves de Wompi
  onlinePaymentEnabled: boolean;
  codEnabled: boolean;
  transferEnabled: boolean;
  transferAccounts: TransferAccount[];
};

const newId = () => Math.random().toString(36).slice(2, 10);

export function PaymentsForm({ data }: { data: PaymentsData }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updatePaymentsAction,
    undefined,
  );
  const [transfer, setTransfer] = useState(data.transferEnabled);
  const [accounts, setAccounts] = useState<TransferAccount[]>(
    data.transferAccounts,
  );

  const update = (id: string, patch: Partial<TransferAccount>) =>
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) =>
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  const add = () =>
    setAccounts((prev) => [
      ...prev,
      { id: newId(), kind: "BREB", value: "", holder: "", qrUrl: "" },
    ]);

  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <input
        type="hidden"
        name="transferAccountsJson"
        value={serializeTransferAccounts(accounts)}
      />
      <div>
        <h2 className="text-sm font-semibold text-ink">Métodos de pago</h2>
        <p className="mt-1 text-xs text-ink-3">
          Elige cómo pueden pagarte tus clientes. Puedes tener varios activos y
          el cliente escoge al hacer el pedido.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            name="onlinePayment"
            defaultChecked={data.wompiReady && data.onlinePaymentEnabled}
            disabled={!data.wompiReady}
            className="mt-0.5 h-4 w-4 rounded border-line-2"
          />
          <span>
            <span className="font-medium">Pago en línea (Wompi)</span>
            <span className="block text-xs text-ink-3">
              {data.wompiReady
                ? "Tarjeta, PSE, Nequi… El pago se confirma solo. Wompi cobra una comisión por cada pago."
                : "Aún no está configurado. Pídeselo al administrador de la plataforma."}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            name="codPayment"
            defaultChecked={data.codEnabled}
            className="mt-0.5 h-4 w-4 rounded border-line-2"
          />
          <span>
            <span className="font-medium">Contra entrega</span>
            <span className="block text-xs text-ink-3">
              El cliente paga al recibir el pedido.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            name="transferPayment"
            checked={transfer}
            onChange={(e) => setTransfer(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line-2"
          />
          <span>
            <span className="font-medium">
              Transferencia / QR (sin comisión)
            </span>
            <span className="block text-xs text-ink-3">
              El cliente paga directo a tu cuenta con tu QR, llave Bre-B, Nequi,
              Daviplata o cuenta bancaria, y te envía el comprobante. Tú (o la
              sede) revisas que llegó el dinero y marcas el pedido como
              &ldquo;Pagado&rdquo;.
            </span>
          </span>
        </label>
      </div>

      {transfer && (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-medium text-ink">
            Tus cuentas para recibir pagos
          </p>
          {accounts.length === 0 && (
            <p className="text-xs text-ink-3">
              Agrega al menos una: tu llave Bre-B, Nequi, Daviplata o cuenta
              bancaria. Si tienes el QR, súbelo como imagen.
            </p>
          )}

          {accounts.map((a) => {
            const kind = TRANSFER_KINDS.find((k) => k.value === a.kind);
            return (
              <div
                key={a.id}
                className="space-y-3 rounded-lg border border-line bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={a.kind}
                    onChange={(e) =>
                      update(a.id, { kind: e.target.value as TransferKind })
                    }
                    className={`${inputCls} flex-1`}
                    aria-label="Tipo"
                  >
                    {TRANSFER_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="rounded-lg border border-line-2 p-2 text-ink-3 hover:text-bad-ink"
                    aria-label="Quitar cuenta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>
                      Llave / número
                    </label>
                    <input
                      value={a.value}
                      onChange={(e) => update(a.id, { value: e.target.value })}
                      inputMode="text"
                      placeholder={kind?.placeholder}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Titular (opcional)</label>
                    <input
                      value={a.holder}
                      onChange={(e) => update(a.id, { holder: e.target.value })}
                      placeholder="Nombre que verá el cliente"
                      className={inputCls}
                    />
                  </div>
                </div>
                <ImageUpload
                  name={`qr_${a.id}`}
                  label="Código QR (opcional)"
                  defaultUrl={a.qrUrl}
                  onChange={(url) => update(a.id, { qrUrl: url })}
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={add}
            disabled={accounts.length >= 6}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Agregar cuenta o QR
          </button>
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <Check className="h-4 w-4" /> Métodos de pago guardados
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar métodos de pago"}
      </button>
    </form>
  );
}

const labelCls = "mb-1 block text-sm font-medium text-ink-2";
const inputCls =
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
