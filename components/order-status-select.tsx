"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/app/admin/orders/actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
} from "@/lib/order-status";

// Selector de estado del pedido: al cambiarlo, guarda directo (sin abrir el pedido).
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [value, setValue] = useState<OrderStatus>(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Estado del pedido"
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        setValue(next);
        const fd = new FormData();
        fd.set("orderId", orderId);
        fd.set("status", next);
        startTransition(() => updateOrderStatusAction(fd));
      }}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 ${ORDER_STATUS_BADGE[value]}`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-gray-900">
          {ORDER_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
