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
  PENDING: "bg-warn-soft text-warn-ink",
  PAID: "bg-ok-soft text-ok-ink",
  SHIPPED: "bg-ok-soft text-ok-ink",
  CANCELLED: "bg-surface-3 text-ink-3",
};

// "Facturado" solo cuenta lo cobrado (pagado). Pendiente/cancelado no suman.
export const isPaidStatus = (status: OrderStatus): boolean => status === "PAID";

// Para "Facturado" contamos solo pedidos ENTREGADOS: es el dinero realmente
// recibido (en contraentrega el pago se cobra justo al entregar).
export const isDelivered = (fulfillment: Fulfillment): boolean =>
  fulfillment === "DELIVERED";

// ─── Estado de ATENCIÓN (independiente del pago) ────────────────────────────
// Llega "por confirmar"; la tienda lo confirma (antes o después del
// comprobante), lo despacha y lo marca entregado (eso cuenta en "Facturado").
export const FULFILLMENT_STATUSES: Fulfillment[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  PENDING: "Por confirmar",
  CONFIRMED: "Confirmado",
  SHIPPED: "En camino",
  DELIVERED: "Entregado",
};

export const FULFILLMENT_BADGE: Record<Fulfillment, string> = {
  PENDING: "bg-warn-soft text-warn-ink",
  CONFIRMED: "bg-alt-soft text-alt-ink",
  SHIPPED: "bg-info-soft text-info-ink",
  DELIVERED: "bg-ok-soft text-ok-ink",
};

export const FULFILLMENT_COLOR: Record<Fulfillment, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#8b5cf6",
  SHIPPED: "#3b82f6",
  DELIVERED: "#16a34a",
};

/** Qué significa cada estado para el cliente (rastreo / mi cuenta). */
export const FULFILLMENT_HINT: Record<Fulfillment, string> = {
  PENDING: "La tienda recibió tu pedido y pronto te lo confirma.",
  CONFIRMED: "La tienda confirmó tu pedido y lo está preparando.",
  SHIPPED: "Tu pedido va en camino.",
  DELIVERED: "Tu pedido fue entregado. ¡Gracias por tu compra!",
};
