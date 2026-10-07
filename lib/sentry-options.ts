// Opciones comunes de Sentry (servidor, edge y navegador). Sin DSN no se
// envía nada: basta con definir NEXT_PUBLIC_SENTRY_DSN en Vercel para activarlo.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Solo errores (el plan gratis cuenta también el rendimiento).
  tracesSampleRate: 0,
  // Sin datos personales de los clientes (IP, cookies, cuerpo de formularios).
  sendDefaultPii: false,
};
