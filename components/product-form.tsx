"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/app/admin/actions";
import { ImageUpload } from "@/components/image-upload";
import { MultiImageUpload } from "@/components/multi-image-upload";

type Category = { id: string; name: string };

type VariantRow = { color: string; size: string; stock: number };

type ProductDefaults = {
  id?: string;
  name?: string;
  description?: string | null;
  priceCents?: number;
  stock?: number;
  imageUrl?: string | null;
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
  const [variants, setVariants] = useState<VariantRow[]>(
    defaults?.variants ?? [],
  );

  const cleanVariants = variants
    .map((v) => ({
      color: v.color.trim(),
      size: v.size.trim(),
      stock: v.stock,
    }))
    .filter((v) => v.color.length > 0 || v.size.length > 0);

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
                ? (defaults.priceCents / 100).toFixed(2)
                : ""
            }
            placeholder="19.99"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Stock {cleanVariants.length > 0 && "(sin variantes)"}
          </label>
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={defaults?.stock ?? 0}
            disabled={cleanVariants.length > 0}
            className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
          />
        </div>
      </div>

      {/* Variantes: color + talla con stock por combinación */}
      <div className="rounded-lg border border-gray-200 p-4">
        <input
          type="hidden"
          name="variants"
          value={JSON.stringify(cleanVariants)}
        />
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Variantes (color / talla)
          </label>
          <button
            type="button"
            onClick={() =>
              setVariants((v) => [...v, { color: "", size: "", stock: 0 }])
            }
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            + Añadir variante
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-xs text-gray-400">
            Sin variantes: se usa el stock general de arriba. Añade combinaciones
            de color y/o talla (cada una con su stock).
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex-1">Color</span>
              <span className="flex-1">Talla</span>
              <span className="w-20">Stock</span>
              <span className="w-7" />
            </div>
            {variants.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={v.color}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, color: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="Negro"
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={v.size}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, size: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="M"
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) =>
                    setVariants((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, stock: Number(e.target.value) || 0 }
                          : r,
                      ),
                    )
                  }
                  className={`${inputCls} w-20`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setVariants((rows) => rows.filter((_, i) => i !== idx))
                  }
                  className="rounded-md border border-red-200 px-2 py-2 text-xs text-red-600 hover:bg-red-50"
                  aria-label="Quitar variante"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              Deja el color o la talla vacío si esa dimensión no aplica.
            </p>
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
