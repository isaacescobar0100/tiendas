import type { OrderStatus, Fulfillment } from "@prisma/client";

// ─── Estado de PAGO ──────────────────────────────────────────────────────────
// (El enum aún incluye SHIPPED por compatibilidad, pero ya no se usa como pago.)
export const PAYMENT_STATUSES: OrderStatus[] = ["PENDING", "PAID", "CANCELLED"];

export const PAYMENT_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  SHIPPED: "Pagado", // legado
  CANCELLED: "Cancelado",
};

export const PAYMENT_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  SHIPPED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// "Facturado" solo cuenta lo cobrado (pagado). Pendiente/cancelado no suman.
export const isPaidStatus = (status: OrderStatus): boolean => status === "PAID";

// Para "Facturado" contamos solo pedidos ENTREGADOS: es el dinero realmente
// recibido (en contraentrega el pago se cobra justo al entregar).
export const isDelivered = (fulfillment: Fulfillment): boolean =>
  fulfillment === "DELIVERED";

// ─── Estado de ENVÍO (independiente del pago) ────────────────────────────────
export const FULFILLMENT_STATUSES: Fulfillment[] = [
  "PENDING",
  "SHIPPED",
  "DELIVERED",
];

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  PENDING: "Por enviar",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

export const FULFILLMENT_BADGE: Record<Fulfillment, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
};
