// Gráficas reutilizables (SVG/CSS puro, sin librerías). Server components.
import { formatPrice } from "@/lib/utils";

export type DayPoint = { label: string; cents: number };

/** Barras de ventas por día. */
export function SalesBars({
  days,
  color,
  currency,
}: {
  days: DayPoint[];
  color: string;
  currency: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.cents));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {days.map((d, i) => {
          const h = d.cents > 0 ? Math.max(3, (d.cents / max) * 100) : 0;
          return (
            <div
              key={i}
              title={`${d.label} · ${formatPrice(d.cents, currency)}`}
              className="flex flex-1 items-end"
              style={{ height: "100%" }}
            >
              <div
                className="w-full rounded-t transition-opacity hover:opacity-80"
                style={{
                  height: `${h}%`,
                  backgroundColor: d.cents > 0 ? color : "#e5e7eb",
                  minHeight: 2,
                }}
              />
            </div>
          );
        })}
      </div>
      {days.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-gray-400">
          <span>{days[0].label}</span>
          <span>{days[days.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

export type Segment = { label: string; value: number; color: string };

/** Dona de estados con leyenda. */
export function Donut({
  segments,
  total,
  centerLabel = "total",
}: {
  segments: Segment[];
  total: number;
  centerLabel?: string;
}) {
  const size = 132;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">Sin datos aún.</p>
    );
  }

  const nonZero = segments.filter((s) => s.value > 0);
  const lengths = nonZero.map((s) => (s.value / total) * c);
  const arcs = nonZero.map((s, i) => ({
    color: s.color,
    label: s.label,
    len: lengths[i],
    offset: -lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={stroke}
            />
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={`${a.len} ${c - a.len}`}
                strokeDashoffset={a.offset}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[11px] text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
            <span className="font-medium text-gray-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type BarItem = { label: string; value: number; display: string };

/** Ranking con barras horizontales. */
export function HBars({ items, color }: { items: BarItem[]; color: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">Sin datos.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate pr-2 text-gray-800">{it.label}</span>
            <span className="shrink-0 font-medium text-gray-900">
              {it.display}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (it.value / max) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
