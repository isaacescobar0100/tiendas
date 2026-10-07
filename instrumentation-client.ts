import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Monitoreo de errores en el navegador (Sentry). Se activa solo con
// NEXT_PUBLIC_SENTRY_DSN definido.
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
