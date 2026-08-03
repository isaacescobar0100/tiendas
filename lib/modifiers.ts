// Adiciones / opciones de un producto (para comida): grupos de opciones que el
// cliente elige, cada una con un precio extra opcional.
//   - "Término de la carne" (elegir una, obligatorio): Medio, Tres cuartos…
//   - "Adiciones" (elegir varias): +Queso $3.000, +Tocineta $4.000…
//   - "Quitar" (elegir varias): Sin cebolla, Sin salsa…
//
// Se guarda en Product.modifiersJson como JSON (array de grupos). El precio de
// cada opción va en céntimos, igual que el resto de precios del sistema.

export type ModOption = { id: string; name: string; priceCents: number };
export type ModGroup = {
  id: string;
  name: string;
  multiple: boolean; // true = elegir varias (checkbox); false = elegir una (radio)
  required: boolean; // obliga a elegir al menos una
  options: ModOption[];
};

// Una opción elegida por el cliente (lo que viaja en el carrito).
export type SelectedMod = {
  optionId: string;
  groupName: string;
  optionName: string;
  priceCents: number;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function parseModifiers(json: string | null | undefined): ModGroup[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((g): ModGroup => {
        const gg = (g ?? {}) as Partial<ModGroup>;
        const options = Array.isArray(gg.options)
          ? gg.options
              .map((o) => {
                const oo = (o ?? {}) as Partial<ModOption>;
                return {
                  id: String(oo.id ?? ""),
                  name: String(oo.name ?? "").trim(),
                  priceCents: Math.max(0, Math.round(Number(oo.priceCents) || 0)),
                };
              })
              .filter((o) => o.name)
          : [];
        return {
          id: String(gg.id ?? ""),
          name: String(gg.name ?? "").trim(),
          multiple: Boolean(gg.multiple),
          required: Boolean(gg.required),
          options,
        };
      })
      .filter((g) => g.name && g.options.length > 0);
  } catch {
    return [];
  }
}

// Limpia y re-serializa (para guardar). Descarta grupos/opciones sin nombre y
// asegura ids estables y precios enteros >= 0. "" si queda vacío.
export function serializeModifiers(groups: ModGroup[]): string {
  const clean = (groups ?? [])
    .map((g) => ({
      id: g.id || uid(),
      name: (g.name ?? "").trim(),
      multiple: Boolean(g.multiple),
      required: Boolean(g.required),
      options: (g.options ?? [])
        .map((o) => ({
          id: o.id || uid(),
          name: (o.name ?? "").trim(),
          priceCents: Math.max(0, Math.round(Number(o.priceCents) || 0)),
        }))
        .filter((o) => o.name),
    }))
    .filter((g) => g.name && g.options.length > 0);
  return clean.length > 0 ? JSON.stringify(clean) : "";
}

// Etiqueta legible de una selección: "Bien asado · +Queso extra · Sin cebolla".
export function buildModifierLabel(selected: SelectedMod[]): string {
  return selected
    .map((s) => (s.priceCents > 0 ? `+${s.optionName}` : s.optionName))
    .join(" · ");
}

export type SelectionResult = {
  ok: boolean;
  error?: string;
  addedCents: number;
  label: string;
  selected: SelectedMod[];
};

// Valida las opciones elegidas contra la definición del producto y calcula el
// precio extra y la etiqueta. Se usa en la tienda y (autoritativo) en el server.
export function resolveSelection(
  groups: ModGroup[],
  selectedIds: string[],
): SelectionResult {
  const idSet = new Set(selectedIds);
  const selected: SelectedMod[] = [];
  for (const g of groups) {
    const chosen = g.options.filter((o) => idSet.has(o.id));
    if (g.required && chosen.length === 0) {
      return {
        ok: false,
        error: `Elige una opción en "${g.name}".`,
        addedCents: 0,
        label: "",
        selected: [],
      };
    }
    if (!g.multiple && chosen.length > 1) {
      return {
        ok: false,
        error: `Solo puedes elegir una opción en "${g.name}".`,
        addedCents: 0,
        label: "",
        selected: [],
      };
    }
    for (const o of chosen) {
      selected.push({
        optionId: o.id,
        groupName: g.name,
        optionName: o.name,
        priceCents: o.priceCents,
      });
    }
  }
  const addedCents = selected.reduce((n, s) => n + s.priceCents, 0);
  return { ok: true, addedCents, label: buildModifierLabel(selected), selected };
}

// Firma estable de una selección (para diferenciar líneas del carrito).
export function modifierSignature(
  mods: { optionId: string }[] | null | undefined,
): string {
  if (!mods || mods.length === 0) return "";
  return mods
    .map((m) => m.optionId)
    .sort()
    .join(",");
}
