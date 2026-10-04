"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Search, Tag } from "lucide-react";
import { keepFormSubmit } from "@/components/keep-form";
import { formatPrice } from "@/lib/utils";
import { saveDiscountAction, type DiscountState } from "./actions";

export type DiscountData = {
  id: string;
  name: string;
  percent: number;
  scope: string;
  categoryIds: string[];
  productIds: string[];
  startsAt: string; // "YYYY-MM-DDTHH:mm" en hora de Colombia o ""
  endsAt: string;
  active: boolean;
};

const inputCls =
  "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelCls = "mb-1 block text-sm font-medium text-ink-2";

// Crear / editar un descuento por porcentaje sobre productos existentes.
export function DiscountForm({
  discount,
  categories,
  products,
  currency,
}: {
  discount?: DiscountData;
  categories: { id: string; name: string }[];
  products: { id: string; name: string; priceCents: number; categoryName: string | null }[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<DiscountState, FormData>(saveDiscountAction, undefined);
  const [scope, setScope] = useState(discount?.scope ?? "products");
  const [percent, setPercent] = useState(discount?.percent ?? 10);
  const [picked, setPicked] = useState<Set<string>>(new Set(discount?.productIds ?? []));
  const [q, setQ] = useState("");
  const shown = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())),
    [products, q],
  );
  const example = products[0];
  const pct = Math.min(90, Math.max(0, Math.round(percent) || 0));

  return (
    <form onSubmit={keepFormSubmit(formAction)} className="space-y-5">
      {discount && <input type="hidden" name="id" value={discount.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div>
          <label className={labelCls}>Nombre</label>
          <input name="name" defaultValue={discount?.name ?? ""} placeholder="Martes de hamburguesas" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Descuento</label>
          <div className="relative">
            <input
              name="percent"
              type="number"
              min={1}
              max={90}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className={`${inputCls} pr-8`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">%</span>
          </div>
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>Se aplica a</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["all", "Toda la tienda"],
            ["categories", "Categorías"],
            ["products", "Productos elegidos"],
          ].map(([v, l]) => (
            <label
              key={v}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${scope === v ? "border-brand bg-brand-soft font-semibold text-brand-text" : "border-line text-ink-2 hover:bg-surface-2"}`}
            >
              <input type="radio" name="scope" value={v} checked={scope === v} onChange={() => setScope(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      {scope === "categories" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-2">
              <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={discount?.categoryIds.includes(c.id)} className="h-4 w-4 rounded border-line-2" />
              {c.name}
            </label>
          ))}
        </div>
      )}

      {scope === "products" && (
        <div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className={`${inputCls} pl-9`} />
          </div>
          <p className="mb-2 text-xs text-ink-3">{picked.size} elegido{picked.size === 1 ? "" : "s"}</p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
            {products.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2 ${shown.includes(p) ? "" : "hidden"}`}
              >
                <input
                  type="checkbox"
                  name="productIds"
                  value={p.id}
                  checked={picked.has(p.id)}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(p.id);
                      else n.delete(p.id);
                      return n;
                    })
                  }
                  className="h-4 w-4 rounded border-line-2"
                />
                <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                <span className="shrink-0 text-xs text-ink-3">
                  {formatPrice(p.priceCents, currency)}
                  {pct > 0 && (
                    <span className="ml-1.5 font-semibold text-ok-ink">
                      → {formatPrice(Math.round((p.priceCents * (100 - pct)) / 100 / 100) * 100, currency)}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Empieza (opcional)</label>
          <input type="datetime-local" name="startsAt" defaultValue={discount?.startsAt ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Termina (opcional)</label>
          <input type="datetime-local" name="endsAt" defaultValue={discount?.endsAt ?? ""} className={inputCls} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-ink-3">Hora de Colombia. Vacío = empieza ya / no termina.</p>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" name="active" defaultChecked={discount ? discount.active : true} className="h-4 w-4 rounded border-line-2" />
        Activo
      </label>

      {example && pct > 0 && scope !== "products" && (
        <p className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <Tag className="h-4 w-4" /> Ejemplo: {example.name} de {formatPrice(example.priceCents, currency)} queda en{" "}
          {formatPrice(Math.round((example.priceCents * (100 - pct)) / 100 / 100) * 100, currency)}
        </p>
      )}

      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">{state.error}</p>}
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
        {pending ? "Guardando…" : discount ? "Guardar cambios" : "Crear descuento"}
      </button>
    </form>
  );
}
