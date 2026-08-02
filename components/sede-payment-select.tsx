"use client";

import { useState } from "react";
import { PAYMENT_STATUSES, PAYMENT_LABEL } from "@/lib/order-status";
import { updateSedePaymentAction } from "@/app/sede/actions";

// Selector de estado de PAGO para el panel de sede. Guarda al cambiar.
export function SedePaymentSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: string;
}) {
  const [val, setVal] = useState(current);
  return (
    <form action={updateSedePaymentAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <select
        name="status"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          e.currentTarget.form?.requestSubmit();
        }}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-gray-900"
      >
        {PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PAYMENT_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
