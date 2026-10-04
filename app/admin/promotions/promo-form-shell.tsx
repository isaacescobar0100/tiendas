"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { PromoState } from "./actions";

/**
 * Formulario de promoción con respuesta visible: "Guardando…", el resultado
 * ("Promoción creada" / el error exacto) y, al crear, se limpia para la
 * siguiente. Si hay error NO se borra lo escrito.
 */
export function PromoFormShell({
  action,
  submitLabel,
  resetOnSuccess = false,
  children,
}: {
  action: (prev: PromoState, formData: FormData) => Promise<PromoState>;
  submitLabel: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PromoState>();
  const [version, setVersion] = useState(0);
  const [pending, start] = useTransition();

  return (
    <form
      key={version}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(undefined, data);
          setState(r);
          if (r?.ok && resetOnSuccess) setVersion((v) => v + 1);
        });
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <Check className="h-4 w-4" /> {state.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
