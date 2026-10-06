import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { discountedCents, discountPercent, effectivePriceCents, isOnSale } from "@/lib/pricing";
import { applyDiscount, discountFor, type DiscountRule } from "@/lib/discounts";
import { computeShipping } from "@/lib/shipping";

const rule = (r: Partial<DiscountRule>): DiscountRule => ({
  id: "d",
  percent: 10,
  scope: "all",
  categoryIds: [],
  productIds: [],
  ...r,
});

describe("precio efectivo", () => {
  it("usa la oferta solo si es válida (0 < oferta < precio)", () => {
    expect(effectivePriceCents({ priceCents: 20000, salePriceCents: 15000 })).toBe(15000);
    expect(effectivePriceCents({ priceCents: 20000, salePriceCents: 0 })).toBe(20000);
    expect(effectivePriceCents({ priceCents: 20000, salePriceCents: 25000 })).toBe(20000);
    expect(effectivePriceCents({ priceCents: 20000, salePriceCents: null })).toBe(20000);
    expect(isOnSale({ priceCents: 20000, salePriceCents: 20000 })).toBe(false);
  });

  it("porcentaje de descuento redondeado", () => {
    expect(discountPercent({ priceCents: 20000, salePriceCents: 15000 })).toBe(25);
    expect(discountPercent({ priceCents: 20000, salePriceCents: null })).toBe(0);
  });

  it("descuento porcentual redondeado a pesos enteros", () => {
    expect(discountedCents(1850000, 10)).toBe(1665000);
    expect(discountedCents(1999900, 15) % 100).toBe(0);
  });
});

describe("descuentos de la tienda", () => {
  const p = { id: "p1", categoryId: "c1", priceCents: 20000, salePriceCents: null as number | null };

  it("toma el mayor porcentaje que aplica y nunca más de 90 %", () => {
    expect(discountFor(p, [rule({ percent: 10 }), rule({ percent: 30, scope: "categories", categoryIds: ["c1"] })])).toBe(30);
    expect(discountFor(p, [rule({ percent: 95 })])).toBe(90);
    expect(discountFor(p, [rule({ scope: "products", productIds: ["otro"] })])).toBe(0);
  });

  it("respeta una oferta manual más baja", () => {
    expect(applyDiscount({ ...p, salePriceCents: 12000 }, [rule({ percent: 10 })]).salePriceCents).toBe(12000);
    expect(applyDiscount(p, [rule({ percent: 10 })]).salePriceCents).toBe(18000);
  });

  it("sin reglas no cambia el producto", () => {
    expect(applyDiscount(p, [])).toBe(p);
  });
});

describe("envío", () => {
  it("fijo, gratis desde un monto o siempre gratis", () => {
    expect(computeShipping(50000, { shippingCents: 5000, freeShippingOverCents: 0 })).toBe(5000);
    expect(computeShipping(100000, { shippingCents: 5000, freeShippingOverCents: 80000 })).toBe(0);
    expect(computeShipping(50000, { shippingCents: 0, freeShippingOverCents: 0 })).toBe(0);
  });
});
