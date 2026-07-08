"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import {
  updateStoreAction,
  changePasswordAction,
  type SettingsState,
} from "./actions";

// Colores de marca sugeridos (todos suficientemente oscuros para texto blanco).
const COLOR_PRESETS = [
  "#111827",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0d9488",
];

type StoreData = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  whatsapp: string | null;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  themeColor: string;
  shippingCents: number;
  freeShippingOverCents: number;
};

export function StoreForm({ store }: { store: StoreData }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateStoreAction,
    undefined,
  );
  const [color, setColor] = useState(store.themeColor || "#111827");

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
        <ImageUpload
          name="bannerUrl"
          label="Banner (portada de la tienda)"
          defaultUrl={store.bannerUrl}
          aspect="wide"
        />
        <p className="mt-1 text-xs text-gray-400">
          Se muestra como portada en la parte superior de tu tienda, a todo el
          ancho. Se ve entera y se adapta sola a PC y móvil. Usa una imagen
          horizontal (recomendado 1600×450). Déjalo vacío para no mostrarlo.
        </p>
      </div>

      <div>
        <label className={labelCls}>WhatsApp (para avisos de pedido)</label>
        <input
          name="whatsapp"
          inputMode="tel"
          defaultValue={store.whatsapp ?? ""}
          placeholder="300 123 4567"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-400">
          Al confirmar un pedido, el cliente verá un botón para enviártelo por
          WhatsApp a este número. Déjalo vacío para no mostrarlo.
        </p>
      </div>

      {/* Canales para avisar al cliente del estado del pedido */}
      <div className="border-t border-gray-100 pt-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">
          Avisar al cliente (va en camino / entregado)
        </h2>
        <p className="mb-3 text-xs text-gray-400">
          Elige por qué canales podrás avisar al cliente desde el pedido.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="notifyEmail"
            defaultChecked={store.notifyEmail}
            className="h-4 w-4 rounded border-gray-300"
          />
          Por email
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="notifyWhatsapp"
            defaultChecked={store.notifyWhatsapp}
            className="h-4 w-4 rounded border-gray-300"
          />
          Por WhatsApp (al número del cliente)
        </label>
      </div>

      {/* Color de marca: se aplica a los botones y acentos de tu tienda */}
      <div>
        <label className={labelCls}>Color de la tienda</label>
        <input type="hidden" name="themeColor" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Usar color ${c}`}
              className={`h-8 w-8 rounded-full border-2 transition ${
                color.toLowerCase() === c.toLowerCase()
                  ? "border-gray-900 ring-2 ring-gray-300"
                  : "border-white shadow"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Color personalizado */}
          <label
            className="ml-1 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600"
            title="Elegir un color personalizado"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Personalizado
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Se usa en los botones y acentos de tu tienda. Elige uno oscuro para
          que el texto blanco se lea bien.
        </p>
      </div>

      <div>
        <label className={labelCls}>Moneda</label>
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          COP · Peso colombiano
        </p>
      </div>

      {/* Envío */}
      <div className="border-t border-gray-100 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Envío</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Costo de envío (por pedido)</label>
            <input
              name="shipping"
              inputMode="numeric"
              defaultValue={String(Math.round(store.shippingCents / 100))}
              placeholder="10000"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              En pesos. Pon <strong>0</strong> para envío gratis siempre.
            </p>
          </div>
          <div>
            <label className={labelCls}>Envío gratis desde (opcional)</label>
            <input
              name="freeShippingOver"
              inputMode="numeric"
              defaultValue={String(
                Math.round(store.freeShippingOverCents / 100),
              )}
              placeholder="100000"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              Si el pedido supera este monto, el envío es gratis. <strong>0</strong>{" "}
              = desactivado.
            </p>
          </div>
        </div>
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
