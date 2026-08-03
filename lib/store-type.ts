import type { StoreType } from "@prisma/client";

// Etiquetas y reglas por tipo de negocio. El tipo decide qué se muestra/oculta.
export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  FASHION: "Moda / Ropa",
  FOOD: "Comida / Restaurante",
  LIQUOR: "Licores",
};

export const STORE_TYPE_OPTIONS: { value: StoreType; label: string; hint: string }[] =
  [
    {
      value: "FASHION",
      label: "Moda / Ropa",
      hint: "Tallas y colores, con control de stock.",
    },
    {
      value: "FOOD",
      label: "Comida / Restaurante",
      hint: "Adiciones, horario y sedes. Sin tallas ni stock (a la carta).",
    },
    {
      value: "LIQUOR",
      label: "Licores",
      hint: "Con stock y aviso de +18. Sin tallas.",
    },
  ];

// ¿Se controla el stock? (la comida es a la carta: no se cuenta stock)
export function tracksStock(type: StoreType): boolean {
  return type !== "FOOD";
}

// ¿Usa variantes de talla/color? (solo moda)
export function usesVariants(type: StoreType): boolean {
  return type === "FASHION";
}

// ¿Usa adiciones/opciones? (solo comida)
export function usesModifiers(type: StoreType): boolean {
  return type === "FOOD";
}

// ¿Requiere confirmar mayoría de edad? (solo licores)
export function isAgeRestricted(type: StoreType): boolean {
  return type === "LIQUOR";
}
