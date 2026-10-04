"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { keepFormSubmit } from "@/components/keep-form";
import { saveSeoAction, type SeoState } from "./actions";
import type { StoreType } from "@prisma/client";
import { seoHomeTitle } from "@/lib/seo";

const inputCls =
  "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink";

/**
 * Textos para Google con vista previa en vivo. Los campos vacíos se arman
 * solos (nombre + lo que vende + ciudad), así que no es obligatorio llenarlos.
 */
export function SeoForm({
  initial,
  storeName,
  url,
  storeType,
  autoKeywords,
  autoDescription,
}: {
  initial: { seoTitle: string; seoDescription: string; seoCity: string; seoKeywords: string };
  storeName: string;
  url: string;
  storeType: StoreType;
  autoKeywords: string; // de las categorías, si no escriben «lo que vendes»
  autoDescription: string;
}) {
  const [state, action, pending] = useActionState<SeoState, FormData>(saveSeoAction, undefined);
  const [v, setV] = useState(initial);
  // Mismo título automático que usan las páginas de la tienda.
  const autoTitle = (x: { city: string; keywords: string }) =>
    seoHomeTitle({ slug: "", name: storeName, type: storeType, seoCity: x.city.trim() || null, seoKeywords: x.keywords.trim() || autoKeywords });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const title = v.seoTitle.trim() || autoTitle({ city: v.seoCity, keywords: v.seoKeywords });
  const description = v.seoDescription.trim() || autoDescription;
  const shownUrl = url.replace(/^https?:\/\//, "");

  return (
    <form onSubmit={keepFormSubmit(action)} className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-ink">Cómo te encuentran en Google</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          Con la ciudad y lo que vendes, el sistema arma títulos como «{storeName} | Hamburguesas en Barranquilla»
          en todas tus páginas. Si dejas un campo vacío, se completa solo.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-2">Ciudad principal</span>
          <input name="seoCity" value={v.seoCity} onChange={set("seoCity")} maxLength={60} placeholder="Barranquilla" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-2">Lo que vendes (separado por comas)</span>
          <input name="seoKeywords" value={v.seoKeywords} onChange={set("seoKeywords")} maxLength={300} placeholder={autoKeywords ? `Vacío = sus categorías: ${autoKeywords}` : "Hamburguesas, desgranados, salchipapas"} className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 flex justify-between text-sm font-medium text-ink-2">
          Título para Google (opcional)
          <span className={`text-xs font-normal ${title.length > 60 ? "text-warn-ink" : "text-ink-4"}`}>{title.length}/60</span>
        </span>
        <input name="seoTitle" value={v.seoTitle} onChange={set("seoTitle")} maxLength={70} placeholder={autoTitle({ city: v.seoCity, keywords: v.seoKeywords })} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 flex justify-between text-sm font-medium text-ink-2">
          Descripción para Google (opcional)
          <span className={`text-xs font-normal ${description.length > 160 ? "text-warn-ink" : "text-ink-4"}`}>{description.length}/160</span>
        </span>
        <textarea name="seoDescription" value={v.seoDescription} onChange={set("seoDescription")} maxLength={170} rows={3} placeholder={autoDescription} className={`${inputCls} resize-none`} />
      </label>

      {/* Vista previa como en Google (siempre clara, como el buscador) */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Así se vería en Google</p>
        <div className="rounded-xl bg-white p-4 font-[arial,sans-serif] shadow-sm ring-1 ring-black/10">
          <p className="truncate text-xs text-[#202124]">{shownUrl}</p>
          <p className="mt-0.5 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[#4d5156]">{description}</p>
        </div>
      </div>

      {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">{state.error}</p>}
      {state?.ok && (
        <p role="status" className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          <Check className="h-4 w-4" /> {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
