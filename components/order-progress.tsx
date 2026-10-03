import type { Fulfillment, OrderStatus } from "@prisma/client";
import {
  FULFILLMENT_STATUSES,
  FULFILLMENT_LABEL,
  FULFILLMENT_HINT,
} from "@/lib/order-status";

// Línea de progreso del pedido para el cliente:
// por confirmar → confirmado → en camino → entregado.
export function OrderProgress({
  fulfillment,
  status,
}: {
  fulfillment: Fulfillment;
  status: OrderStatus;
}) {
  if (status === "CANCELLED") {
    return (
      <p className="mt-4 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-3">
        Este pedido fue cancelado.
      </p>
    );
  }
  const current = FULFILLMENT_STATUSES.indexOf(fulfillment);
  return (
    <div className="mt-5">
      <ol className="flex items-start">
        {FULFILLMENT_STATUSES.map((s, i) => {
          const done = i <= current;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-2 h-0.5 w-full ${done ? "bg-brand" : "bg-line"}`}
                />
              )}
              <span
                className={`relative z-10 h-4 w-4 rounded-full border-2 ${done ? "border-brand bg-brand" : "border-line-2 bg-surface"}`}
              />
              <span
                className={`mt-1.5 text-center text-[11px] leading-tight ${i === current ? "font-semibold text-ink" : done ? "text-ink-2" : "text-ink-3"}`}
              >
                {FULFILLMENT_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-ink-2">
        {FULFILLMENT_HINT[fulfillment]}
      </p>
    </div>
  );
}
