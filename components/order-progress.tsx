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
      <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
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
                  className={`absolute right-1/2 top-2 h-0.5 w-full ${done ? "bg-[var(--brand)]" : "bg-gray-200"}`}
                />
              )}
              <span
                className={`relative z-10 h-4 w-4 rounded-full border-2 ${done ? "border-[var(--brand)] bg-[var(--brand)]" : "border-gray-300 bg-white"}`}
              />
              <span
                className={`mt-1.5 text-center text-[11px] leading-tight ${i === current ? "font-semibold text-gray-900" : done ? "text-gray-600" : "text-gray-400"}`}
              >
                {FULFILLMENT_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-gray-600">
        {FULFILLMENT_HINT[fulfillment]}
      </p>
    </div>
  );
}
