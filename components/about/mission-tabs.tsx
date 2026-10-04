"use client";

import { useId, useState } from "react";
import { Compass, Target } from "lucide-react";

type Tab = { key: "mission" | "vision"; label: string; text: string };

/** Misión y visión en pestañas (con flechas del teclado, como pide ARIA). */
export function MissionTabs({ mission, vision }: { mission: string; vision: string }) {
  const tabs = (
    [
      { key: "mission", label: "Misión", text: mission },
      { key: "vision", label: "Visión", text: vision },
    ] as Tab[]
  ).filter((t) => t.text);
  const [active, setActive] = useState(0);
  const id = useId();
  if (tabs.length === 0) return null;
  const current = tabs[Math.min(active, tabs.length - 1)];
  const Icon = current.key === "mission" ? Target : Compass;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Misión y visión"
          className="flex gap-1 border-b border-line bg-surface-2 p-1.5"
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = (active + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            setActive(next);
            document.getElementById(`${id}-tab-${next}`)?.focus();
          }}
        >
          {tabs.map((t, i) => (
            <button
              key={t.key}
              id={`${id}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={`${id}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                i === active ? "bg-brand text-brand-ink shadow-sm" : "text-ink-3 hover:bg-surface hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div
        id={`${id}-panel`}
        role={tabs.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={tabs.length > 1 ? `${id}-tab-${active}` : undefined}
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-6 sm:p-8"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
          <Icon className="h-6 w-6" />
        </span>
        <div key={current.key} className="about-fade">
          <h3 className="text-lg font-bold text-ink">{current.label}</h3>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-2">{current.text}</p>
        </div>
      </div>
    </div>
  );
}
