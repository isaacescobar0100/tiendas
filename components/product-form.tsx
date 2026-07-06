"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { ActionState } from "@/app/admin/actions";
import { ImageUpload } from "@/components/image-upload";
import { MultiImageUpload } from "@/components/multi-image-upload";
import { variantLabel } from "@/lib/utils";

type Category = { id: string; name: string };

const stockKey = (color: string, size: string) => `${color}|||${size}`;

type ProductDefaults = {
  id?: string;
  name?: string;
  description?: string | null;
  priceCents?: number;
  stock?: number;
  imageUrl?: string | null;
  imagePosition?: string;
  imageZoom?: number;
  categoryId?: string | null;
  active?: boolean;
  images?: string[];
  variants?: { color: string; size: string; stock: number }[];
};

export function ProductForm({
  action,
  categories,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  defaults?: ProductDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  // Colores y tallas se definen por separado; el sistema arma las combinaciones.
  const initialVariants = defaults?.variants ?? [];
  const initColors = [
    ...new Set(initialVariants.map((v) => v.color).filter(Boolean)),
  ];
  const initSizes = [
    ...new Set(initialVariants.map((v) => v.size).filter(Boolean)),
  ];
  const [colors, setColors] = useState<string[]>(initColors);
  const [sizes, setSizes] = useState<string[]>(initSizes);
  // Guardamos el stock como texto para que el campo se pueda vaciar y no meta
  // ceros a la izquierda; se convierte a número al construir las variantes.
  const [stock, setStockState] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const v of initialVariants) {
      m[stockKey(v.color, v.size)] = v.stock ? String(v.stock) : "";
    }
    return m;
  });
  // Combinaciones excluidas (que no existen). Al editar, arrancamos ocultando
  // las combinaciones color×talla que no estaban creadas (asimétricas).
  const [removed, setRemoved] = useState<Set<string>>(() => {
    const r = new Set<string>();
    if (initialVariants.length === 0) return r;
    const existing = new Set(
      initialVariants.map((v) => stockKey(v.color, v.size)),
    );
    for (const c of initColors.length ? initColors : [""]) {
      for (const s of initSizes.length ? initSizes : [""]) {
        const k = stockKey(c, s);
        if (!existing.has(k)) r.add(k);
      }
    }
    return r;
  });

  const hasVariants = colors.length > 0 || sizes.length > 0;
  // Combinaciones color × talla, excluyendo las que el usuario quitó.
  const combos: { color: string; size: string }[] = [];
  if (hasVariants) {
    for (const c of colors.length ? colors : [""]) {
      for (const s of sizes.length ? sizes : [""]) {
        if (!removed.has(stockKey(c, s))) combos.push({ color: c, size: s });
      }
    }
  }
  const cleanVariants = combos.map(({ color, size }) => ({
    color,
    size,
    stock: Number(stock[stockKey(color, size)] || 0),
  }));
  // Stock general = suma de las variantes (cuando las hay).
  const totalStock = cleanVariants.reduce((n, v) => n + v.stock, 0);

  const addTag = (setter: typeof setColors, list: string[], raw: string) => {
    const val = raw.trim();
    if (val && !list.includes(val)) setter([...list, val]);
  };
  const setStock = (color: string, size: string, raw: string) => {
    // Solo dígitos, sin ceros a la izquierda (permite vacío = 0).
    const digits = raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
    setStockState((prev) => ({ ...prev, [stockKey(color, size)]: digits }));
  };
  const removeCombo = (color: string, size: string) =>
    setRemoved((prev) => new Set(prev).add(stockKey(color, size)));

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
    >
      {defaults?.id && (
        <input type="hidden" name="id" value={defaults.id} />
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Nombre
        </label>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Camiseta de algodón"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          placeholder="Detalles del producto…"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Precio
          </label>
          <input
            name="price"
            required
            inputMode="decimal"
            defaultValue={
              defaults?.priceCents != null
                ? String(defaults.priceCents / 100)
                : ""
            }
            placeholder="50000"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {hasVariants ? "Stock total" : "Stock"}
          </label>
          {hasVariants ? (
            // Con variantes: el general es la suma (solo lectura), pero sí se envía.
            <input
              name="stock"
              type="text"
              readOnly
              value={totalStock}
              className={`${inputCls} bg-gray-100 text-gray-500`}
            />
          ) : (
            <input
              name="stock"
              type="number"
              min={0}
              defaultValue={defaults?.stock ?? 0}
              className={inputCls}
            />
          )}
          {hasVariants && (
            <p className="mt-1 text-xs text-gray-400">
              Suma automática del stock de cada variante.
            </p>
          )}
        </div>
      </div>

      {/* Variantes: se definen colores y tallas por separado y se combinan */}
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <input
          type="hidden"
          name="variants"
          value={JSON.stringify(cleanVariants)}
        />
        <div>
          <label className="text-sm font-medium text-gray-700">
            Variantes (tallas y colores)
          </label>
          <p className="mt-1 text-xs text-gray-500">
            ¿Tu producto viene en varias tallas o colores? Añádelos abajo y el
            sistema arma solas todas las combinaciones para que pongas el stock
            de cada una. Si no, deja esto vacío y usa el{" "}
            <strong>Stock</strong> de arriba.
          </p>
        </div>

        <TagInput
          label="Colores"
          hint="Deja vacío si el producto no varía en color."
          placeholder="Escribe un color y pulsa Enter (ej. Negro)"
          values={colors}
          onAdd={(v) => addTag(setColors, colors, v)}
          onRemove={(v) => setColors(colors.filter((c) => c !== v))}
        />

        <TagInput
          label="Tallas"
          hint="Puede ser letra o número (S, M, L, 38, 42, Única…)."
          placeholder="Escribe una talla y pulsa Enter (ej. M)"
          values={sizes}
          onAdd={(v) => addTag(setSizes, sizes, v)}
          onRemove={(v) => setSizes(sizes.filter((s) => s !== v))}
        />

        {combos.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Sin variantes: se usará el <strong>Stock</strong> de arriba.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              Stock por variante
            </p>
            <div className="space-y-2">
              {combos.map(({ color, size }) => {
                const key = stockKey(color, size);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-800">
                      {variantLabel(color, size) || "Única"}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stock[key] ?? ""}
                      onChange={(e) => setStock(color, size, e.target.value)}
                      placeholder="0"
                      aria-label={`Stock de ${variantLabel(color, size) || "única"}`}
                      className={`${inputCls} w-24`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCombo(color, size)}
                      className="rounded-md border border-red-200 px-2 py-2 text-red-600 hover:bg-red-50"
                      aria-label={`Quitar ${variantLabel(color, size) || "variante"}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Categoría
        </label>
        <select
          name="categoryId"
          defaultValue={defaults?.categoryId ?? ""}
          className={inputCls}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <ImageUpload
        name="imageUrl"
        label="Imagen principal"
        defaultUrl={defaults?.imageUrl}
        reposition
        positionName="imagePosition"
        defaultPosition={defaults?.imagePosition ?? "50% 50%"}
        zoomName="imageZoom"
        defaultZoom={defaults?.imageZoom ?? 1}
      />

      <MultiImageUpload name="images" defaultUrls={defaults?.images ?? []} />

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaults?.active ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        Publicado (visible en la tienda)
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link
          href="/admin/products"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";

// Campo de "etiquetas": escribes un valor y con Enter (o coma) lo añades como chip.
function TagInput({
  label,
  hint,
  placeholder,
  values,
  onAdd,
  onRemove,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const commit = () => {
    if (text.trim()) onAdd(text);
    setText("");
  };
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 p-2 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-800"
          >
            {v}
            <button
              type="button"
              onClick={() => onRemove(v)}
              className="text-gray-400 hover:text-red-500"
              aria-label={`Quitar ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-[10rem] flex-1 text-sm outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
