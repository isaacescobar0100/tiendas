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
import { StatusSelect } from "@/components/status-select";

const pill = "cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-line-2";

// Selector de estado de PAGO del pedido (guarda al instante).
export function PaymentSelect({ orderId, value }: { orderId: string; value: OrderStatus }) {
  return (
    <StatusSelect
      orderId={orderId}
      name="status"
      value={value}
      options={PAYMENT_STATUSES}
      labels={PAYMENT_LABEL}
      ariaLabel="Estado de pago"
      action={updateOrderStatusAction}
      className={(v) => `${pill} ${PAYMENT_BADGE[v as OrderStatus] ?? ""}`}
    />
  );
}

// Selector de estado de ENVÍO del pedido (guarda al instante).
export function FulfillmentSelect({ orderId, value }: { orderId: string; value: Fulfillment }) {
  return (
    <StatusSelect
      orderId={orderId}
      name="fulfillment"
      value={value}
      options={FULFILLMENT_STATUSES}
      labels={FULFILLMENT_LABEL}
      ariaLabel="Estado de envío"
      action={updateFulfillmentAction}
      className={(v) => `${pill} ${FULFILLMENT_BADGE[v as Fulfillment] ?? ""}`}
    />
  );
}
