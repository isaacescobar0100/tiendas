"use client";

import { Truck } from "lucide-react";
import { useCart } from "./cart-context";
import { formatPrice } from "@/lib/utils";

// Aviso de "envío gratis" según el carrito y la config de la tienda.
export function FreeShippingNote() {
  const { totalCents, currency, shippingCents, freeShippingOverCents } =
    useCart();

  // La tienda no cobra envío nunca → siempre gratis.
  if (shippingCents <= 0) {
    return <FreeBadge>Envío gratis</FreeBadge>;
  }

  // Hay umbral de envío gratis.
  if (freeShippingOverCents > 0) {
    if (totalCents >= freeShippingOverCents) {
      return <FreeBadge>¡Tienes envío gratis!</FreeBadge>;
    }
    const falta = freeShippingOverCents - totalCents;
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-2 text-xs font-medium text-warn-ink">
        <Truck className="h-4 w-4 shrink-0" />
        Te faltan {formatPrice(falta, currency)} para el envío gratis
      </div>
    );
  }

  // Envío con costo fijo y sin umbral → no mostramos nada especial.
  return null;
}

function FreeBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-xs font-medium text-ok-ink">
      <Truck className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}
