"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";

// Piezas del formulario de acceso. Usan los tokens del tema (el AuthShell
// pone el de la tienda o el de la plataforma).

const inputCls =
  "w-full rounded-xl border border-line-2 bg-surface py-3 pl-11 pr-3 text-[15px] text-ink outline-none transition placeholder:text-ink-4 focus:border-brand focus:ring-4 focus:ring-brand/15";

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{subtitle}</p>}
    </div>
  );
}

export function Field({
  id,
  label,
  icon: Icon,
  ...props
}: { id: string; label: string; icon: LucideIcon } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" aria-hidden />
        <input id={id} {...props} className={inputCls} />
      </div>
    </div>
  );
}

/** Contraseña con mostrar/ocultar y aviso de Bloq Mayús. */
export function PasswordField({
  id,
  label,
  icon: Icon,
  aside,
  ...props
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  aside?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-ink-2">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-4" aria-hidden />
        <input
          id={id}
          type={show ? "text" : "password"}
          onKeyDown={onKey}
          onKeyUp={onKey}
          aria-describedby={caps ? `${id}-caps` : undefined}
          {...props}
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {caps && (
        <p id={`${id}-caps`} className="mt-1.5 text-xs font-medium text-warn-ink">
          Bloq Mayús está activado.
        </p>
      )}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const err = kind === "error";
  const Icon = err ? AlertCircle : CheckCircle2;
  return (
    <div
      role={err ? "alert" : "status"}
      className={`flex gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-relaxed ${err ? "bg-bad-soft text-bad-ink" : "bg-ok-soft text-ok-ink"}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingText,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingText: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-[15px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-wait disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}
