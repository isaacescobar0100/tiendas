"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import {
  updateStoreAction,
  changePasswordAction,
  type SettingsState,
} from "./actions";

const CURRENCIES = ["USD", "EUR", "COP", "MXN", "ARS", "CLP", "PEN", "BRL", "GBP"];

type StoreData = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  currency: string;
};

export function StoreForm({ store }: { store: StoreData }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateStoreAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <h2 className="text-sm font-semibold text-gray-900">Datos de la tienda</h2>

      <Field label="Nombre" name="name" defaultValue={store.name} required />

      <div>
        <label className={labelCls}>Descripción</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={store.description ?? ""}
          placeholder="Cuenta de qué va tu tienda…"
          className={inputCls}
        />
      </div>

      <ImageUpload name="logoUrl" label="Logo" defaultUrl={store.logoUrl} />

      <div>
        <label className={labelCls}>Moneda</label>
        <select
          name="currency"
          defaultValue={store.currency}
          className={inputCls}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <Alert type="error">{state.error}</Alert>}
      {state?.ok && <Alert type="ok">Cambios guardados</Alert>}

      <button
        type="submit"
        disabled={pending}
        className={btnCls}
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>

      <Field
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
      />
      <Field
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        required
        autoComplete="new-password"
      />
      <Field
        label="Repite la nueva contraseña"
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
      />

      {state?.error && <Alert type="error">{state.error}</Alert>}
      {state?.ok && <Alert type="ok">Contraseña actualizada</Alert>}

      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Guardando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input {...props} className={inputCls} />
    </div>
  );
}

function Alert({
  type,
  children,
}: {
  type: "error" | "ok";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
        type === "error"
          ? "bg-red-50 text-red-600"
          : "bg-green-50 text-green-700"
      }`}
    >
      {type === "ok" && <Check className="h-4 w-4" />}
      {children}
    </p>
  );
}

const labelCls = "mb-1 block text-sm font-medium text-gray-700";
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
const btnCls =
  "rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60";
