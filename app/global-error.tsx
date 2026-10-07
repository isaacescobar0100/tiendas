"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Error que rompe toda la página (incluido el layout raíz): se reporta a
// Sentry y se muestra un aviso simple con opción de reintentar.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ color: "#555", marginBottom: 20 }}>Ya nos llegó el aviso. Intenta de nuevo en un momento.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #ccc", background: "#111", color: "#fff", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
