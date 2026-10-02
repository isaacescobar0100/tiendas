import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

export type NoticeKind = "confirmed" | "shipped";

type OrderForNotice = {
  id: string;
  customerName: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  totalCents: number;
  currency: string;
  address: string;
};

/**
 * Qué falta del pago, visto por el cliente. La confirmación de la tienda puede
 * salir antes del comprobante (se lo pide) o después (ya está pagado).
 */
function paymentLine(o: OrderForNotice, total: string): string {
  if (o.status === "PAID" || o.status === "SHIPPED") {
    return "Ya recibimos tu pago y estamos preparando tu pedido.";
  }
  if (o.paymentMethod === "COD") {
    return `Pagas al recibir: ${total}. Ya lo estamos preparando.`;
  }
  if (o.paymentMethod === "TRANSFER") {
    return `Total a pagar: ${total}. Envíanos por aquí el comprobante de pago y empezamos a prepararlo.`;
  }
  return `Total: ${total}. Tu pago aún figura pendiente; si ya pagaste, envíanos el comprobante por aquí.`;
}

/** Texto del aviso al cliente (mismo contenido para WhatsApp y email). */
export function noticeText(
  kind: NoticeKind,
  o: OrderForNotice,
  storeName: string,
): { title: string; lines: string[] } {
  const short = o.id.slice(-8);
  const total = formatPrice(o.totalCents, o.currency);
  if (kind === "confirmed") {
    return {
      title: `Pedido #${short} confirmado`,
      lines: [
        `Hola ${o.customerName}, ${storeName} confirmó tu pedido #${short}.`,
        paymentLine(o, total),
        `Entrega: ${o.address}`,
      ],
    };
  }
  return {
    title: `Tu pedido #${short} va en camino`,
    lines: [
      `Hola ${o.customerName}, tu pedido #${short} de ${storeName} ya va en camino.`,
      `Entrega: ${o.address}`,
      o.status === "PAID" || o.status === "SHIPPED"
        ? `Total: ${total} (pagado).`
        : `Total: ${total}.`,
      "¡Gracias por tu compra!",
    ],
  };
}

/** Estado al que pasa el pedido al enviar el aviso (nunca retrocede). */
export const NOTICE_STATE = { confirmed: "CONFIRMED", shipped: "SHIPPED" } as const;
