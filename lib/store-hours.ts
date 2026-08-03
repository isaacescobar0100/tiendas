// Horario de atención de la tienda: decide si está ABIERTA o CERRADA ahora
// (en hora de Colombia) para no dejar hacer pedidos fuera de horario.
//
// Se guarda en Store.hoursJson como JSON:
//   { "enabled": true, "days": [ {closed,open,close} x7 ] }
// El array `days` va indexado por día de la semana de JS: 0=Domingo … 6=Sábado.
// `open`/`close` en formato "HH:MM" (24h). Si close <= open, el turno cruza la
// medianoche (ej. abre 18:00 y cierra 02:00).

export type DayHours = { closed: boolean; open: string; close: string };
export type StoreHours = { enabled: boolean; days: DayHours[] };

export const DAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// Orden de presentación en el formulario (lunes primero), con su índice getDay.
export const DAY_ORDER: { idx: number; label: string }[] = [
  { idx: 1, label: "Lunes" },
  { idx: 2, label: "Martes" },
  { idx: 3, label: "Miércoles" },
  { idx: 4, label: "Jueves" },
  { idx: 5, label: "Viernes" },
  { idx: 6, label: "Sábado" },
  { idx: 0, label: "Domingo" },
];

// ¿El producto es "merch"? (su categoría está marcada como merch en Ajustes).
// El merch se puede pedir aunque la tienda esté cerrada.
export function isMerchProduct(
  categoryId: string | null | undefined,
  merchCategoryIds: string[] | null | undefined,
): boolean {
  if (!categoryId || !merchCategoryIds || merchCategoryIds.length === 0)
    return false;
  return merchCategoryIds.includes(categoryId);
}

const TZ = "America/Bogota";
const WEEK = 7 * 1440;

function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

// Día por defecto de un horario nuevo (abierto 8:00–18:00).
export function defaultDay(): DayHours {
  return { closed: false, open: "08:00", close: "18:00" };
}
export function defaultHours(): StoreHours {
  return { enabled: false, days: Array.from({ length: 7 }, defaultDay) };
}

export function parseStoreHours(
  json: string | null | undefined,
): StoreHours | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as unknown;
    if (
      !p ||
      typeof p !== "object" ||
      !Array.isArray((p as { days?: unknown }).days) ||
      (p as { days: unknown[] }).days.length !== 7
    ) {
      return null;
    }
    const obj = p as { enabled?: unknown; days: unknown[] };
    const days = obj.days.map((d) => {
      const dd = (d ?? {}) as Partial<DayHours>;
      return {
        closed: Boolean(dd.closed),
        open: String(dd.open ?? ""),
        close: String(dd.close ?? ""),
      };
    });
    return { enabled: Boolean(obj.enabled), days };
  } catch {
    return null;
  }
}

// Limpia y re-serializa un horario (para guardarlo canónico). Devuelve "" si es
// inválido (equivale a "siempre abierto / sin restricción").
export function serializeStoreHours(hours: StoreHours | null): string {
  if (!hours || hours.days.length !== 7) return "";
  return JSON.stringify({
    enabled: Boolean(hours.enabled),
    days: hours.days.map((d) => ({
      closed: Boolean(d.closed),
      open: toMin(d.open) != null ? d.open : "",
      close: toMin(d.close) != null ? d.close : "",
    })),
  });
}

// Turnos de la semana como intervalos [inicio, fin) en "minuto de la semana".
// `fin` puede superar WEEK cuando el turno cruza la medianoche.
function windows(days: DayHours[]): [number, number][] {
  const res: [number, number][] = [];
  for (let d = 0; d < 7; d++) {
    const day = days[d];
    if (!day || day.closed) continue;
    const o = toMin(day.open);
    const c = toMin(day.close);
    if (o == null || c == null || o === c) continue;
    const start = d * 1440 + o;
    const end = c > o ? d * 1440 + c : d * 1440 + 1440 + c; // cruza medianoche
    res.push([start, end]);
  }
  return res;
}

// Hora actual en Bogotá como día de la semana (0=Dom) y minutos desde medianoche.
function bogotaNow(): { dow: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (hour === 24) hour = 0; // algunas versiones de ICU devuelven "24" a medianoche
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { dow: map[wd] ?? 0, min: hour * 60 + minute };
}

export type OpenState = {
  enforced: boolean; // ¿hay horario activo que limite pedidos?
  isOpen: boolean;
  message: string | null; // ej. "Abrimos mañana a las 11:00"
};

// Estado de apertura AHORA (Bogotá) a partir del hoursJson guardado.
export function getStoreOpenState(
  hoursJson: string | null | undefined,
): OpenState {
  const hours = parseStoreHours(hoursJson);
  if (!hours || !hours.enabled) {
    return { enforced: false, isOpen: true, message: null };
  }
  const wins = windows(hours.days);
  if (wins.length === 0) {
    return { enforced: true, isOpen: false, message: "Cerrado temporalmente." };
  }

  const { dow, min } = bogotaNow();
  const mow = dow * 1440 + min;

  const isOpen = wins.some(
    ([s, e]) =>
      (mow >= s && mow < e) || (mow + WEEK >= s && mow + WEEK < e),
  );
  if (isOpen) return { enforced: true, isOpen: true, message: null };

  // Próxima apertura: menor inicio de turno que esté en el futuro.
  const candidate = Math.min(...wins.map(([s]) => (s > mow ? s : s + WEEK)));
  return { enforced: true, isOpen: false, message: nextOpenLabel(candidate, mow) };
}

function nextOpenLabel(candidate: number, mow: number): string {
  const min = candidate % 1440;
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  const time = `${hh}:${mm}`;
  const daysAhead = Math.floor(candidate / 1440) - Math.floor(mow / 1440);
  const dow = Math.floor(candidate / 1440) % 7;
  let when: string;
  if (daysAhead <= 0) when = "hoy";
  else if (daysAhead === 1) when = "mañana";
  else when = `el ${DAY_LABELS[dow]}`;
  return `Abrimos ${when} a las ${time}`;
}
