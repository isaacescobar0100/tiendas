"use client";

import { PAYMENT_STATUSES, PAYMENT_LABEL } from "@/lib/order-status";
import { updateSedePaymentAction } from "@/app/sede/actions";
import { StatusSelect } from "@/components/status-select";

// Selector de estado de PAGO para el panel de sede. Guarda al cambiar.
export function SedePaymentSelect({ orderId, current }: { orderId: string; current: string }) {
  return (
    <StatusSelect
      orderId={orderId}
      name="status"
      value={current}
      options={PAYMENT_STATUSES}
      labels={PAYMENT_LABEL}
      ariaLabel="Estado de pago"
      action={updateSedePaymentAction}
      className={() => "rounded-lg border border-line-2 bg-surface px-2 py-1 text-xs outline-none focus:border-ink"}
    />
  );
}
