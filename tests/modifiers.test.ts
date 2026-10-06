import { describe, expect, it } from "vitest";
import { resolveSelection, type ModGroup } from "@/lib/modifiers";

const groups: ModGroup[] = [
  {
    id: "g1",
    name: "Término",
    multiple: false,
    required: true,
    options: [
      { id: "a", name: "Bien asado", priceCents: 0 },
      { id: "b", name: "Medio", priceCents: 0 },
    ],
  },
  {
    id: "g2",
    name: "Adiciones",
    multiple: true,
    required: false,
    options: [
      { id: "q", name: "Queso extra", priceCents: 300000 },
      { id: "t", name: "Tocineta", priceCents: 400000 },
    ],
  },
];

describe("adiciones del menú", () => {
  it("suma el precio de las adiciones elegidas", () => {
    const r = resolveSelection(groups, ["a", "q", "t"]);
    expect(r.ok).toBe(true);
    expect(r.addedCents).toBe(700000);
    expect(r.label).toBe("Bien asado · +Queso extra · +Tocineta");
  });

  it("exige los grupos obligatorios y una sola opción donde corresponde", () => {
    expect(resolveSelection(groups, ["q"]).ok).toBe(false);
    expect(resolveSelection(groups, ["a", "b"]).ok).toBe(false);
  });

  it("ignora opciones que no son del producto (el precio no lo decide el cliente)", () => {
    const r = resolveSelection(groups, ["a", "inventada"]);
    expect(r.ok).toBe(true);
    expect(r.addedCents).toBe(0);
  });
});
