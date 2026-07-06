"use client";

import { useState, useTransition } from "react";
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

function StatusSelect({
  orderId,
  value,
  field,
}: {
  orderId: string;
  value: string;
  field: "payment" | "fulfillment";
}) {
  const [val, setVal] = useState(value);
  const [pending, startTransition] = useTransition();

  const isPayment = field === "payment";
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
    <select
      value={val}
      disabled={pending}
      aria-label={isPayment ? "Estado de pago" : "Estado de envío"}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const fd = new FormData();
        fd.set("orderId", orderId);
        fd.set(isPayment ? "status" : "fulfillment", next);
        startTransition(() =>
          isPayment
            ? updateOrderStatusAction(fd)
            : updateFulfillmentAction(fd),
        );
      }}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 ${badges[val] ?? ""}`}
    >
      {options.map((s) => (
        <option key={s} value={s} className="bg-white text-gray-900">
          {labels[s]}
        </option>
      ))}
    </select>
  );
}
