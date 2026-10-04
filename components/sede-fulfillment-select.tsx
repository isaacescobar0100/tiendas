"use client";

import { FULFILLMENT_STATUSES, FULFILLMENT_LABEL } from "@/lib/order-status";
import { updateSedeFulfillmentAction } from "@/app/sede/actions";
import { StatusSelect } from "@/components/status-select";

// Selector de estado de envío para el panel de sede. Guarda al cambiar.
export function SedeFulfillmentSelect({ orderId, current }: { orderId: string; current: string }) {
  return (
    <StatusSelect
      orderId={orderId}
      name="fulfillment"
      value={current}
      options={FULFILLMENT_STATUSES}
      labels={FULFILLMENT_LABEL}
      ariaLabel="Estado de envío"
      action={updateSedeFulfillmentAction}
      className={() => "rounded-lg border border-line-2 bg-surface px-2 py-1 text-xs outline-none focus:border-ink"}
    />
  );
}
