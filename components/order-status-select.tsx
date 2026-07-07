"use client";

import type { OrderStatus, Fulfillment } from "@prisma/client";
import {
  updateOrderStatusAction,
  updateFulfillmentAction,
} from "@/app/admin/orders/actions";
import {
  PAYMENT_STATUSES,
  PAYMENT_LABEL,
  PAYMENT_BADGE,
  FULFILLMENT_STATUSES,
  FULFILLMENT_LABEL,
  FULFILLMENT_BADGE,
} from "@/lib/order-status";

// Selector de estado de PAGO del pedido (guarda al instante).
export function PaymentSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: OrderStatus;
}) {
  return <StatusSelect orderId={orderId} value={value} field="payment" />;
}

// Selector de estado de ENVÍO del pedido (guarda al instante).
export function FulfillmentSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: Fulfillment;
}) {
  return <StatusSelect orderId={orderId} value={value} field="fulfillment" />;
}

// Usa un <form action={serverAction}> (patrón fiable en Next) y se auto-envía
// al cambiar. Al guardar, revalidatePath recarga la página con el nuevo valor.
function StatusSelect({
  orderId,
  value,
  field,
}: {
  orderId: string;
  value: string;
  field: "payment" | "fulfillment";
}) {
  const isPayment = field === "payment";
  const action = isPayment ? updateOrderStatusAction : updateFulfillmentAction;
  const options = (isPayment ? PAYMENT_STATUSES : FULFILLMENT_STATUSES) as string[];
  const labels = (isPayment ? PAYMENT_LABEL : FULFILLMENT_LABEL) as Record<
    string,
    string
  >;
  const badges = (isPayment ? PAYMENT_BADGE : FULFILLMENT_BADGE) as Record<
    string,
    string
  >;

  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <select
        name={isPayment ? "status" : "fulfillment"}
        defaultValue={value}
        aria-label={isPayment ? "Estado de pago" : "Estado de envío"}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-gray-300 ${badges[value] ?? ""}`}
      >
        {options.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900">
            {labels[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
