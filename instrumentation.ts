import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Monitoreo de errores del servidor (Sentry). Se activa solo con
// NEXT_PUBLIC_SENTRY_DSN definido.
export function register() {
  Sentry.init(sentryOptions);
}

// Errores de páginas, acciones y rutas del servidor.
export const onRequestError = Sentry.captureRequestError;
