"use client";

import { useState, useTransition } from "react";

/**
 * Selector de estado de un pedido que guarda al cambiar. Siempre muestra el
 * estado REAL: si el servidor rechaza el cambio (ej. un pedido cancelado no se
 * reabre) vuelve al valor anterior y dice por qué; y si el pedido cambia por
 * otro lado (tiempo real, otra persona), se pone al día solo.
 */
export function StatusSelect({
  orderId,
  name,
  value,
  options,
  labels,
  ariaLabel,
  action,
  className,
}: {
  orderId: string;
  name: string; // campo que espera la acción ("status" / "fulfillment")
  value: string;
  options: readonly string[];
  labels: Record<string, string>;
  ariaLabel: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  className: (value: string) => string;
}) {
  const [val, setVal] = useState(value);
  const [synced, setSynced] = useState(value);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // El servidor manda un valor nuevo (se guardó, o cambió por otro lado).
  if (value !== synced) {
    setSynced(value);
    setVal(value);
  }

  return (
    <div className="inline-flex flex-col items-start">
      <select
        name={name}
        value={val}
        disabled={pending}
        aria-label={ariaLabel}
        aria-busy={pending}
        onChange={(e) => {
          const next = e.target.value;
          const before = val;
          setVal(next);
          setError("");
          const fd = new FormData();
          fd.set("orderId", orderId);
          fd.set(name, next);
          start(async () => {
            try {
              const r = await action(fd);
              if (r && r.error) {
                setVal(before);
                setError(r.error);
              }
            } catch {
              setVal(before);
              setError("No se pudo guardar. Revisa tu conexión.");
            }
          });
        }}
        className={`${className(val)} transition disabled:cursor-wait disabled:opacity-60`}
      >
        {options.map((s) => (
          <option key={s} value={s} className="bg-surface text-ink">
            {labels[s]}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 max-w-[15rem] text-[11px] leading-snug text-bad-ink">
          {error}
        </p>
      )}
    </div>
  );
}
