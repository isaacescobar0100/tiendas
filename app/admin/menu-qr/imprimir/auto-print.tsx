"use client";

import { useEffect } from "react";

/** Abre el diálogo de impresión al cargar (cuando se imprime una sola mesa). */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
