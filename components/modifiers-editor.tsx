"use client";

import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import {
  parseModifiers,
  serializeModifiers,
  type ModGroup,
} from "@/lib/modifiers";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const emptyGroup = (): ModGroup => ({
  id: uid(),
  name: "",
  multiple: false,
  required: false,
  options: [{ id: uid(), name: "", priceCents: 0 }],
});

// Editor de adiciones/opciones del producto. Emite un JSON en `modifiersJson`.
export function ModifiersEditor({ initialJson }: { initialJson?: string }) {
  const [groups, setGroups] = useState<ModGroup[]>(
    () => parseModifiers(initialJson),
  );

  const patchGroup = (gi: number, patch: Partial<ModGroup>) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, ...patch } : g)),
    );
  const patchOption = (
    gi: number,
    oi: number,
    patch: Partial<{ name: string; priceCents: number }>,
  ) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              options: g.options.map((o, j) =>
                j === oi ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );

  const addGroup = () => setGroups((p) => [...p, emptyGroup()]);
  const removeGroup = (gi: number) =>
    setGroups((p) => p.filter((_, i) => i !== gi));
  const addOption = (gi: number) =>
    setGroups((p) =>
      p.map((g, i) =>
        i === gi
          ? { ...g, options: [...g.options, { id: uid(), name: "", priceCents: 0 }] }
          : g,
      ),
    );
  const removeOption = (gi: number, oi: number) =>
    setGroups((p) =>
      p.map((g, i) =>
        i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g,
      ),
    );

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <input type="hidden" name="modifiersJson" value={serializeModifiers(groups)} />

      <div>
        <label className="text-sm font-medium text-gray-700">
          Adiciones y opciones (para comida)
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Crea grupos de opciones: por ejemplo <strong>Término</strong> (elegir
          uno), <strong>Adiciones</strong> (+queso $3.000) o{" "}
          <strong>Quitar</strong> (sin cebolla). Cada opción puede sumar un
          precio. Déjalo vacío si el producto no lleva opciones.
        </p>
      </div>

      {groups.map((g, gi) => (
        <div key={g.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
            <input
              value={g.name}
              onChange={(e) => patchGroup(gi, { name: e.target.value })}
              placeholder="Nombre del grupo (ej. Término de la carne)"
              className={`${inputCls} flex-1 font-medium`}
            />
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
              aria-label="Quitar grupo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-4 pl-6 text-xs text-gray-600">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`mult-${g.id}`}
                checked={!g.multiple}
                onChange={() => patchGroup(gi, { multiple: false })}
              />
              Elegir una
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`mult-${g.id}`}
                checked={g.multiple}
                onChange={() => patchGroup(gi, { multiple: true })}
              />
              Elegir varias
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={g.required}
                onChange={(e) => patchGroup(gi, { required: e.target.checked })}
              />
              Obligatorio
            </label>
          </div>

          <div className="mt-3 space-y-2 pl-6">
            {g.options.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-2">
                <input
                  value={o.name}
                  onChange={(e) => patchOption(gi, oi, { name: e.target.value })}
                  placeholder="Opción (ej. Queso extra)"
                  className={`${inputCls} flex-1`}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">+$</span>
                  <input
                    value={o.priceCents ? String(Math.round(o.priceCents / 100)) : ""}
                    onChange={(e) =>
                      patchOption(gi, oi, {
                        priceCents:
                          (Number(e.target.value.replace(/[^\d]/g, "")) || 0) * 100,
                      })
                    }
                    inputMode="numeric"
                    placeholder="0"
                    aria-label="Precio extra en pesos"
                    className={`${inputCls} w-24`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(gi, oi)}
                  className="rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Quitar opción"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(gi)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir opción
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Plus className="h-4 w-4" /> Añadir grupo de opciones
      </button>
    </div>
  );
}

const inputCls =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
