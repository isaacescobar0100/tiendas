"use client";

import { useState } from "react";
import {
  FULFILLMENT_STATUSES,
  FULFILLMENT_LABEL,
} from "@/lib/order-status";
import { updateSedeFulfillmentAction } from "@/app/sede/actions";

// Selector de estado de envío para el panel de sede. Guarda al cambiar.
export function SedeFulfillmentSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: string;
}) {
  const [val, setVal] = useState(current);
  return (
    <form action={updateSedeFulfillmentAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <select
        name="fulfillment"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          e.currentTarget.form?.requestSubmit();
        }}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-gray-900"
      >
        {FULFILLMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {FULFILLMENT_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
