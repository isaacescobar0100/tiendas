"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";

// Vacía el carrito al montar. Se usa en la página de éxito cuando el pedido
// se completó (con Wompi el carrito no se vacía hasta volver ya pagado).
export default function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
