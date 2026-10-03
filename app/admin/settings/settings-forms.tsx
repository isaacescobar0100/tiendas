"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import {
  parseStoreHours,
  defaultHours,
  defaultDay,
  serializeStoreHours,
  DAY_ORDER,
  type DayHours,
} from "@/lib/store-hours";
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
  bannerVideoUrl: string | null;
  surveyUrl: string | null;
  whatsapp: string | null;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  themeColor: string;
  shippingCents: number;
  freeShippingOverCents: number;
  hoursJson: string;
  merchCategoryIds: string[];
};

type Category = { id: string; name: string };

export function StoreForm({
  store,
  categories,
}: {
  store: StoreData;
  categories: Category[];
}) {
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

      <div>
        <label className={labelCls}>Nombre de la tienda</label>
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          {store.name}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          El nombre lo gestiona el administrador de la plataforma. Escríbele si
          necesitas cambiarlo.
        </p>
      </div>

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
          Portada en la parte superior de tu tienda, a todo el ancho y en franja
          baja. Usa una imagen bien horizontal (recomendado 1600×400) y pon lo
          importante hacia el centro. Déjalo vacío para no mostrarlo.
        </p>
      </div>

      <div>
        <label className={labelCls}>Video de portada (opcional)</label>
        <input
          name="bannerVideoUrl"
          inputMode="url"
          defaultValue={store.bannerVideoUrl ?? ""}
          placeholder="https://…/video.mp4"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-400">
          Pega la URL de un video <strong>.mp4</strong>. Si lo pones, la portada
          muestra el video (en bucle, sin sonido) en vez del banner. Ideal para
          un look tipo landing. Déjalo vacío para usar la imagen.
        </p>
      </div>

      <div>
        <label className={labelCls}>Enlace de encuesta (opcional)</label>
        <input
          name="surveyUrl"
          inputMode="url"
          defaultValue={store.surveyUrl ?? ""}
          placeholder="https://forms.gle/…"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-gray-400">
          Si lo rellenas (ej. un Google Forms), aparece un botón
          &ldquo;Encuesta de satisfacción&rdquo; en el pie de tu tienda.
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

      {/* Horario de atención */}
      <div className="border-t border-gray-100 pt-5">
        <HoursEditor initialJson={store.hoursJson} />
      </div>

      {/* Merch: categorías que se pueden pedir aunque esté cerrado */}
      <div className="border-t border-gray-100 pt-5">
        <MerchCategories
          categories={categories}
          initial={store.merchCategoryIds}
        />
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

// Selección de categorías "merch": se pueden pedir aunque la tienda esté
// cerrada. Emite un checkbox por categoría (name="merchCategoryIds").
function MerchCategories({
  categories,
  initial,
}: {
  categories: Category[];
  initial: string[];
}) {
  const set = new Set(initial);
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-gray-900">
        Merch (se puede pedir aunque esté cerrado)
      </h2>
      <p className="mb-3 text-xs text-gray-400">
        Marca las categorías que se despachan y no dependen del horario (ropa,
        gorras, souvenirs…). Cuando la tienda esté cerrada, solo se podrán pedir
        los productos de estas categorías. La comida déjala sin marcar.
      </p>

      {categories.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Aún no tienes categorías. Crea una categoría de merch en la sección
          Categorías y vuelve aquí para marcarla.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                name="merchCategoryIds"
                value={c.id}
                defaultChecked={set.has(c.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Editor del horario de atención (7 días). Emite un JSON en el campo `hoursJson`.
function HoursEditor({ initialJson }: { initialJson: string }) {
  const initial = parseStoreHours(initialJson) ?? defaultHours();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [days, setDays] = useState<DayHours[]>(initial.days);

  const setDay = (idx: number, patch: Partial<DayHours>) =>
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );

  const hoursJson = serializeStoreHours({ enabled, days });

  return (
    <div>
      <input type="hidden" name="hoursJson" value={hoursJson} />
      <h2 className="mb-1 text-sm font-semibold text-gray-900">
        Horario de atención
      </h2>
      <p className="mb-3 text-xs text-gray-400">
        Si lo activas, la tienda no aceptará pedidos fuera de este horario
        (hora de Colombia) y mostrará cuándo vuelve a abrir.
      </p>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Limitar pedidos a mi horario de atención
      </label>

      <div
        className={`mt-4 space-y-2 ${enabled ? "" : "pointer-events-none opacity-50"}`}
      >
        {DAY_ORDER.map(({ idx, label }) => {
          const d = days[idx] ?? defaultDay();
          return (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="w-24 shrink-0 text-gray-700">{label}</span>
              <label className="flex w-24 items-center gap-1.5 text-gray-600">
                <input
                  type="checkbox"
                  checked={!d.closed}
                  onChange={(e) => setDay(idx, { closed: !e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {d.closed ? "Cerrado" : "Abierto"}
              </label>
              <input
                type="time"
                value={d.open}
                disabled={d.closed}
                onChange={(e) => setDay(idx, { open: e.target.value })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-300"
              />
              <span className="text-gray-400">a</span>
              <input
                type="time"
                value={d.close}
                disabled={d.closed}
                onChange={(e) => setDay(idx, { close: e.target.value })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-300"
              />
            </div>
          );
        })}
        <p className="pt-1 text-xs text-gray-400">
          ¿Cierras después de medianoche? Pon, por ejemplo, abre{" "}
          <strong>18:00</strong> y cierra <strong>02:00</strong>.
        </p>
      </div>
    </div>
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
