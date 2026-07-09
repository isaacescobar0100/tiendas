"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Granularity = "day" | "month" | "year";

export function ExportForm({
  defaults,
}: {
  defaults: { day: string; month: string; year: string };
}) {
  const [type, setType] = useState<Granularity>("month");
  const [day, setDay] = useState(defaults.day);
  const [month, setMonth] = useState(defaults.month);
  const [year, setYear] = useState(defaults.year);

  const value = type === "day" ? day : type === "month" ? month : year;
  const href = `/api/export/orders?type=${type}&value=${encodeURIComponent(value)}`;
  const ready = value.trim().length > 0;

  return (
    <div className="max-w-lg space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
      <div>
        <label className={labelCls}>Agrupar por</label>
        <div className="flex gap-2">
          {(
            [
              ["day", "Día"],
              ["month", "Mes"],
              ["year", "Año"],
            ] as [Granularity, string][]
          ).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setType(val)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                type === val
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-900"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>
          {type === "day" ? "Día" : type === "month" ? "Mes" : "Año"}
        </label>
        {type === "day" && (
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={inputCls}
          />
        )}
        {type === "month" && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={inputCls}
          />
        )}
        {type === "year" && (
          <input
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={inputCls}
          />
        )}
      </div>

      <a
        href={ready ? href : undefined}
        aria-disabled={!ready}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition ${
          ready
            ? "bg-gray-900 hover:bg-gray-800"
            : "pointer-events-none bg-gray-300"
        }`}
      >
        <Download className="h-4 w-4" /> Descargar CSV
      </a>
    </div>
  );
}

const labelCls = "mb-1 block text-sm font-medium text-gray-700";
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
