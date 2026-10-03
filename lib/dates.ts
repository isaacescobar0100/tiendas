// Fechas en hora de Colombia. El servidor (Vercel) corre en UTC: sin esto, un
// pedido de las 10 p. m. aparece con fecha del día siguiente y cae en la
// barra equivocada de las gráficas.

export const TZ = "America/Bogota";

// Colombia es UTC-5 todo el año (sin horario de verano).
const OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;

/** Día calendario en Colombia, "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  return new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Medianoche de Colombia del día `key` (como instante UTC). */
export function startOfDay(key: string): Date {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + OFFSET_MS);
}

/**
 * Los últimos `n` días (el último es hoy), en hora de Colombia. `date` es el
 * mediodía de ese día: formateado con timeZone TZ muestra el día correcto.
 */
export function lastDays(n: number, now = new Date()): { key: string; date: Date }[] {
  const today = startOfDay(dayKey(now)).getTime();
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(today - (n - 1 - i) * DAY_MS + 12 * 3_600_000);
    return { key: dayKey(date), date };
  });
}
