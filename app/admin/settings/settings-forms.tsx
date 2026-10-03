"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { VideoField } from "@/components/video-field";
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
import { keepFormSubmit } from "@/components/keep-form";

type Category = { id: string; name: string };

/**
 * Una sección de Ajustes: su propio formulario y su botón Guardar. Envía
 * "section" y la acción solo actualiza esos campos (no toca las demás).
 */
function SectionForm({
  section,
  title,
  description,
  children,
}: {
  section: "general" | "portada" | "envios" | "horario" | "avisos";
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateStoreAction,
    undefined,
  );
  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <input type="hidden" name="section" value={section} />
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {children}
      {state?.error && <Alert type="error">{state.error}</Alert>}
      {state?.ok && <Alert type="ok">Cambios guardados</Alert>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

export function GeneralForm({
  store,
}: {
  store: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    surveyUrl: string | null;
    whatsapp: string | null;
  };
}) {
  return (
    <SectionForm section="general" title="General" description="Lo básico de tu tienda.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Nombre de la tienda</label>
          <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-3">{store.name}</p>
          <p className="mt-1 text-xs text-ink-3">Lo cambia el administrador de la plataforma.</p>
        </div>
        <div>
          <label className={labelCls}>Moneda</label>
          <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-3">COP · Peso colombiano</p>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>WhatsApp de la tienda</label>
          <input name="whatsapp" inputMode="tel" defaultValue={store.whatsapp ?? ""} placeholder="300 123 4567" className={inputCls} />
          <p className="mt-1 text-xs text-ink-3">Para que el cliente te envíe su pedido. Vacío = no se muestra.</p>
        </div>
        <div>
          <label className={labelCls}>Enlace de encuesta (opcional)</label>
          <input name="surveyUrl" inputMode="url" defaultValue={store.surveyUrl ?? ""} placeholder="https://forms.gle/…" className={inputCls} />
          <p className="mt-1 text-xs text-ink-3">Muestra &ldquo;Encuesta de satisfacción&rdquo; en el pie.</p>
        </div>
      </div>

      <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
        Los colores, la tipografía y las fotos de fondo están en{" "}
        <Link href="/admin/apariencia" prefetch={false} className="font-medium text-ink underline">
          Apariencia
        </Link>
        .
      </p>
    </SectionForm>
  );
}

export function PortadaForm({
  store,
}: {
  store: { bannerUrl: string | null; bannerVideoUrl: string | null };
}) {
  return (
    <SectionForm
      section="portada"
      title="Portada de la tienda"
      description="Lo primero que ven tus clientes: una imagen o un video a todo el ancho."
    >
      <div>
        <ImageUpload name="bannerUrl" label="Imagen de portada (banner)" defaultUrl={store.bannerUrl} aspect="wide" />
        <p className="mt-1 text-xs text-ink-3">
          Bien horizontal (recomendado 1600×400), con lo importante al centro. Vacío = sin banner.
        </p>
      </div>
      <div className="border-t border-line pt-5">
        <label className={labelCls}>Video de portada (opcional)</label>
        <p className="mb-3 text-xs text-ink-3">
          Si pones un video, la portada lo muestra en bucle y sin sonido en lugar de la imagen
          (la imagen queda de fondo mientras carga).
        </p>
        <VideoField name="bannerVideoUrl" defaultUrl={store.bannerVideoUrl} />
      </div>
    </SectionForm>
  );
}

export function EnviosForm({
  store,
}: {
  store: { shippingCents: number; freeShippingOverCents: number };
}) {
  return (
    <SectionForm section="envios" title="Envíos" description="Lo que cobras por llevar el pedido.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Costo de envío (por pedido)</label>
          <input name="shipping" inputMode="numeric" defaultValue={String(Math.round(store.shippingCents / 100))} placeholder="10000" className={inputCls} />
          <p className="mt-1 text-xs text-ink-3">En pesos. <strong>0</strong> = envío gratis siempre.</p>
        </div>
        <div>
          <label className={labelCls}>Envío gratis desde (opcional)</label>
          <input name="freeShippingOver" inputMode="numeric" defaultValue={String(Math.round(store.freeShippingOverCents / 100))} placeholder="100000" className={inputCls} />
          <p className="mt-1 text-xs text-ink-3">Si el pedido supera este monto, el envío es gratis. <strong>0</strong> = desactivado.</p>
        </div>
      </div>
    </SectionForm>
  );
}

export function HorarioForm({
  hoursJson,
  merchCategoryIds,
  categories,
}: {
  hoursJson: string;
  merchCategoryIds: string[];
  categories: Category[];
}) {
  return (
    <SectionForm section="horario" title="Horario de atención" description="Cuándo recibes pedidos.">
      <HoursEditor initialJson={hoursJson} />
      <div className="border-t border-line pt-5">
        <MerchCategories categories={categories} initial={merchCategoryIds} />
      </div>
    </SectionForm>
  );
}

export function AvisosForm({
  store,
}: {
  store: { notifyEmail: boolean; notifyWhatsapp: boolean };
}) {
  return (
    <SectionForm
      section="avisos"
      title="Avisos al cliente"
      description="Por qué canales avisas al cliente que su pedido fue confirmado o va en camino."
    >
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" name="notifyEmail" defaultChecked={store.notifyEmail} className="h-4 w-4 rounded border-line-2" />
        Por email
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" name="notifyWhatsapp" defaultChecked={store.notifyWhatsapp} className="h-4 w-4 rounded border-line-2" />
        Por WhatsApp (al número del cliente)
      </label>
    </SectionForm>
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
      <h2 className="mb-1 text-sm font-semibold text-ink">
        Merch (se puede pedir aunque esté cerrado)
      </h2>
      <p className="mb-3 text-xs text-ink-3">
        Marca las categorías que se despachan y no dependen del horario (ropa,
        gorras, souvenirs…). Cuando la tienda esté cerrada, solo se podrán pedir
        los productos de estas categorías. La comida déjala sin marcar.
      </p>

      {categories.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-3">
          Aún no tienes categorías. Crea una categoría de merch en la sección
          Categorías y vuelve aquí para marcarla.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-2"
            >
              <input
                type="checkbox"
                name="merchCategoryIds"
                value={c.id}
                defaultChecked={set.has(c.id)}
                className="h-4 w-4 rounded border-line-2"
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
      <p className="mb-3 text-xs text-ink-3">
        Si lo activas, la tienda no aceptará pedidos fuera de este horario
        (hora de Colombia) y mostrará cuándo vuelve a abrir.
      </p>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-line-2"
        />
        Limitar pedidos a mi horario de atención
      </label>

      {/* Desactivado: atenuado e inerte (no se puede enfocar ni editar). */}
      <div
        inert={!enabled}
        aria-disabled={!enabled}
        className={`mt-4 space-y-2 ${enabled ? "" : "pointer-events-none opacity-50"}`}
      >
        {DAY_ORDER.map(({ idx, label }) => {
          const d = days[idx] ?? defaultDay();
          return (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="w-24 shrink-0 text-ink-2">{label}</span>
              <label className="flex w-24 items-center gap-1.5 text-ink-2">
                <input
                  type="checkbox"
                  checked={!d.closed}
                  onChange={(e) => setDay(idx, { closed: !e.target.checked })}
                  className="h-4 w-4 rounded border-line-2"
                />
                {d.closed ? "Cerrado" : "Abierto"}
              </label>
              <input
                type="time"
                value={d.open}
                disabled={d.closed}
                onChange={(e) => setDay(idx, { open: e.target.value })}
                className="rounded-lg border border-line-2 px-2 py-1 text-sm disabled:bg-surface-2 disabled:text-ink-4"
              />
              <span className="text-ink-3">a</span>
              <input
                type="time"
                value={d.close}
                disabled={d.closed}
                onChange={(e) => setDay(idx, { close: e.target.value })}
                className="rounded-lg border border-line-2 px-2 py-1 text-sm disabled:bg-surface-2 disabled:text-ink-4"
              />
            </div>
          );
        })}
        <p className="pt-1 text-xs text-ink-3">
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
      onSubmit={keepFormSubmit(formAction)}
      className="space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <h2 className="text-sm font-semibold text-ink">Cambiar contraseña</h2>

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
          ? "bg-bad-soft text-bad-ink"
          : "bg-ok-soft text-ok-ink"
      }`}
    >
      {type === "ok" && <Check className="h-4 w-4" />}
      {children}
    </p>
  );
}

const labelCls = "mb-1 block text-sm font-medium text-ink-2";
const inputCls =
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const btnCls =
  "rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:bg-brand-hover disabled:opacity-60";
