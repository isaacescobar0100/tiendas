// Cálculo del costo de envío de un pedido (modelo: fijo por pedido + gratis
// desde cierto monto). Todos los importes en céntimos.

export type ShippingConfig = {
  shippingCents: number; // costo fijo por pedido (0 = envío gratis siempre)
  freeShippingOverCents: number; // subtotal a partir del cual el envío es gratis (0 = desactivado)
};

/** Devuelve el costo de envío para un subtotal dado. */
export function computeShipping(
  subtotalCents: number,
  cfg: ShippingConfig,
): number {
  if (cfg.shippingCents <= 0) return 0;
  if (cfg.freeShippingOverCents > 0 && subtotalCents >= cfg.freeShippingOverCents) {
    return 0;
  }
  return cfg.shippingCents;
}
