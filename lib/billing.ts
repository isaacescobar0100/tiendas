import type { StorePlan } from "@prisma/client";
import { dayKey } from "@/lib/dates";

// ─── Vencimiento del plan de una tienda ──────────────────────────────────────
// SALE = pago único + cuota ANUAL (infraestructura y soporte).
// RENT = mensualidad (modelo SaaS).
// Ambos vencen en `paidUntil`. Sin fecha = sin control (tiendas antiguas).

export const PLAN_LABEL: Record<StorePlan, string> = {
  SALE: "Pago único + anual",
  RENT: "Mensual",
};

/** Cuánto suma "Renovar" según el plan. */
export const RENEW_MONTHS: Record<StorePlan, number> = { SALE: 12, RENT: 1 };

/** Días antes del vencimiento en que se avisa (de mayor a menor). */
const WARN_DAYS: Record<StorePlan, number[]> = { SALE: [30, 7], RENT: [3] };

/** Días de gracia tras vencer antes de suspender la tienda pública. */
export const GRACE_DAYS = 5;

const DAY = 86_400_000;

export type BillingStatus = "none" | "ok" | "soon" | "grace" | "suspended";

export type Billing = {
  status: BillingStatus;
  /** Días que faltan (negativo = días vencida). null si no hay fecha. */
  days: number | null;
  /** Aviso vigente ("soon30", "soon7", "overdue"...), para no repetir correos. */
  stage: string | null;
};

export function billingOf(
  store: { plan: StorePlan; paidUntil: Date | null },
  now = Date.now(),
): Billing {
  if (!store.paidUntil) return { status: "none", days: null, stage: null };
  const days = Math.ceil((store.paidUntil.getTime() - now) / DAY);
  if (days < -GRACE_DAYS) return { status: "suspended", days, stage: "suspended" };
  if (days < 0) return { status: "grace", days, stage: "overdue" };
  const warn = WARN_DAYS[store.plan].find(
    (w, i, all) => days <= w && (i === all.length - 1 || days > all[i + 1]),
  );
  return warn !== undefined
    ? { status: "soon", days, stage: `soon${warn}` }
    : { status: "ok", days, stage: null };
}

/** La tienda pública (catálogo y compras) está suspendida por falta de pago. */
export const isSuspended = (store: { plan: StorePlan; paidUntil: Date | null }) =>
  billingOf(store).status === "suspended";

/**
 * Nueva fecha al renovar: desde la actual si aún no vence, si no desde hoy.
 * Se cuenta en días de Colombia (el servidor está en UTC) y vence al final
 * del día (23:59:59), igual que la fecha que se escribe en el formulario.
 */
export function renewedUntil(
  store: { plan: StorePlan; paidUntil: Date | null },
  now = new Date(),
): Date {
  const from =
    store.paidUntil && store.paidUntil.getTime() > now.getTime() ? store.paidUntil : now;
  const [y, m, d] = dayKey(from).split("-").map(Number);
  const total = m - 1 + RENEW_MONTHS[store.plan];
  const year = y + Math.floor(total / 12);
  const month = (total % 12) + 1;
  // 31 ene + 1 mes no debe saltar a marzo: se queda en el último día del mes.
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${year}-${pad(month)}-${pad(Math.min(d, last))}T23:59:59-05:00`);
}
