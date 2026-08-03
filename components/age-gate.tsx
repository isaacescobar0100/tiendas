"use client";

import { useEffect, useState } from "react";
import { Wine } from "lucide-react";

// Confirmación de mayoría de edad para tiendas de licores. Se recuerda en el
// navegador (localStorage) para no volver a preguntar en cada visita.
export function AgeGate({
  storeSlug,
  storeName,
}: {
  storeSlug: string;
  storeName: string;
}) {
  const key = `age-ok:${storeSlug}`;
  const [status, setStatus] = useState<"loading" | "ask" | "ok" | "denied">(
    "loading",
  );

  useEffect(() => {
    try {
      setStatus(localStorage.getItem(key) === "1" ? "ok" : "ask");
    } catch {
      setStatus("ask");
    }
  }, [key]);

  if (status === "ok" || status === "loading") return null;

  const confirm = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // ignora (modo privado)
    }
    setStatus("ok");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white">
          <Wine className="h-7 w-7" />
        </div>
        {status === "denied" ? (
          <>
            <h2 className="text-lg font-bold text-gray-900">Lo sentimos</h2>
            <p className="mt-2 text-sm text-gray-500">
              Debes ser mayor de 18 años para ver {storeName}. La venta de
              bebidas alcohólicas está prohibida a menores de edad.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900">
              ¿Eres mayor de 18 años?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {storeName} vende bebidas alcohólicas. Debes ser mayor de edad
              para entrar. El exceso de alcohol es perjudicial para la salud.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStatus("denied")}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                No
              </button>
              <button
                onClick={confirm}
                className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
              >
                Sí, soy mayor de 18
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
