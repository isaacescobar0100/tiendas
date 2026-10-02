"use client";

// Prefijo de rutas de la tienda para componentes de cliente: "" cuando se
// visita por el subdominio/dominio de la tienda, "/slug" en el principal.
import { createContext, useCallback, useContext } from "react";

const StoreBaseContext = createContext<string>("");

export function StoreBaseProvider({
  base,
  children,
}: {
  base: string;
  children: React.ReactNode;
}) {
  return (
    <StoreBaseContext.Provider value={base}>{children}</StoreBaseContext.Provider>
  );
}

/** Devuelve una función que arma rutas de la tienda: href("/cart"). */
export function useStoreHref() {
  const base = useContext(StoreBaseContext);
  return useCallback(
    (path = "") => {
      const out = `${base}${path}`;
      if (!out) return "/";
      return out.startsWith("/") ? out : `/${out}`;
    },
    [base],
  );
}
