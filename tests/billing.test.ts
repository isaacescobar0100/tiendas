import { describe, expect, it } from "vitest";
import { billingOf, renewedUntil } from "@/lib/billing";
import { dayKey } from "@/lib/dates";

const bogota = (day: string) => new Date(`${day}T23:59:59-05:00`);
const now = new Date("2026-01-01T12:00:00-05:00");

describe("renovación del plan (días de Colombia)", () => {
  it.each([
    ["RENT", "2026-04-30", "2026-05-30"],
    ["RENT", "2026-01-30", "2026-02-28"],
    ["RENT", "2026-01-31", "2026-02-28"],
    ["RENT", "2026-12-15", "2027-01-15"],
    ["SALE", "2028-02-29", "2029-02-28"],
  ] as const)("%s desde %s → %s", (plan, from, to) => {
    const r = renewedUntil({ plan, paidUntil: bogota(from) }, now);
    expect(dayKey(r)).toBe(to);
    expect(r.toISOString()).toBe(bogota(to).toISOString()); // vence a las 23:59:59
  });

  it("una tienda vencida renueva desde hoy", () => {
    expect(dayKey(renewedUntil({ plan: "RENT", paidUntil: bogota("2025-06-01") }, now))).toBe("2026-02-01");
  });
});

describe("estado del plan", () => {
  const at = (days: number) => ({ plan: "SALE" as const, paidUntil: new Date(now.getTime() + days * 86_400_000) });
  it("avisa, da gracia y luego suspende", () => {
    expect(billingOf(at(60), now.getTime()).status).toBe("ok");
    expect(billingOf(at(20), now.getTime()).stage).toBe("soon30");
    expect(billingOf(at(5), now.getTime()).stage).toBe("soon7");
    expect(billingOf(at(-2), now.getTime()).status).toBe("grace");
    expect(billingOf(at(-10), now.getTime()).status).toBe("suspended");
    expect(billingOf({ plan: "RENT", paidUntil: null }, now.getTime()).status).toBe("none");
  });
});
