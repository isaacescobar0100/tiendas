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
      // Se lee localStorage DESPUÉS de montar (en el servidor no existe): leerlo al
      // inicializar el estado haría que el HTML del servidor y el del navegador no
      // coincidan. Un render extra al cargar es lo esperado aquí.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-ink">
          <Wine className="h-7 w-7" />
        </div>
        {status === "denied" ? (
          <>
            <h2 className="text-lg font-bold text-ink">Lo sentimos</h2>
            <p className="mt-2 text-sm text-ink-3">
              Debes ser mayor de 18 años para ver {storeName}. La venta de
              bebidas alcohólicas está prohibida a menores de edad.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-ink">
              ¿Eres mayor de 18 años?
            </h2>
            <p className="mt-2 text-sm text-ink-3">
              {storeName} vende bebidas alcohólicas. Debes ser mayor de edad
              para entrar. El exceso de alcohol es perjudicial para la salud.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStatus("denied")}
                className="flex-1 rounded-lg border border-line-2 px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                No
              </button>
              <button
                onClick={confirm}
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink hover:brightness-110"
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
