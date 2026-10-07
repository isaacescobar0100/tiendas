import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { sentryOptions } from "@/lib/sentry-options";

// Monitoreo de errores del servidor (Sentry). Solo envía desde Vercel.
export function register() {
  Sentry.init(sentryOptions);
}

// Errores de páginas, acciones y rutas del servidor. Se espera a que el
// envío salga: en Vercel la función se congela al responder y se perdería.
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  Sentry.captureRequestError(...args);
  await Sentry.flush(2000);
};
