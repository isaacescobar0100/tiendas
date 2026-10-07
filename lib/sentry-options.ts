// Opciones comunes de Sentry (servidor, edge y navegador). El DSN no es
// secreto (viaja al navegador). Solo se envía desde Vercel: en el computador
// (localhost o `next start` local) no se reporta nada.
const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://0b727a62c4e58eab0bad3ed8bd6f320b@o4510391063871488.ingest.us.sentry.io/4512212096778240";

const onVercel =
  typeof window === "undefined"
    ? process.env.VERCEL === "1"
    : !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname);

export const sentryOptions = {
  dsn: DSN,
  enabled: onVercel,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Solo errores (el plan gratis cuenta también el rendimiento).
  tracesSampleRate: 0,
  // Sin datos personales de los clientes (IP, cookies, cuerpo de formularios).
  sendDefaultPii: false,
};
