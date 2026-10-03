"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  DEFAULT_THEME,
  FONT_PAIRS,
  THEME_PRESETS,
  autoFixTheme,
  checkTheme,
  isHex,
  modeMismatch,
  normalizeTheme,
  themeStyle,
  type FontKey,
  type ThemeInput,
} from "@/lib/theme";
import { saveThemeAction } from "./actions";

type ColorKey = "brand" | "bg" | "surface" | "ink";

const COLOR_FIELDS: { key: ColorKey; label: string; hint: string }[] = [
  { key: "brand", label: "Color de marca", hint: "Botones, pestañas activas y acentos" },
  { key: "bg", label: "Fondo", hint: "El fondo de la página" },
  { key: "surface", label: "Superficie", hint: "Tarjetas, cabecera y campos" },
  { key: "ink", label: "Texto", hint: "El texto principal" },
];

export function ThemeEditor({
  initial,
  storeName,
  logoUrl,
}: {
  initial: ThemeInput;
  storeName: string;
  logoUrl: string | null;
}) {
  // Lo que elige el dueño; lo que se ve y se guarda es su versión normalizada.
  const [raw, setRaw] = useState<ThemeInput>(initial);
  const [saved, setSaved] = useState<ThemeInput>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const theme = useMemo(() => normalizeTheme(raw), [raw]);
  const checks = useMemo(() => checkTheme(theme), [theme]);
  const blocking = checks.filter((c) => c.blocking && !c.ok);
  const clamped = (["brand", "bg", "surface", "ink"] as ColorKey[]).filter(
    (k) => raw[k].toLowerCase() !== theme[k],
  );
  const dirty = JSON.stringify(theme) !== JSON.stringify(normalizeTheme(saved));

  const set = (patch: Partial<ThemeInput>) => {
    setMsg(null);
    setRaw((r) => ({ ...r, ...patch }));
  };

  const setMode = (mode: ThemeInput["mode"]) => {
    if (mode === theme.mode) return;
    // Cambiar de modo carga la primera paleta de ese modo conservando la marca.
    const base = THEME_PRESETS.find((p) => p.theme.mode === mode)!.theme;
    set(autoFixTheme({ ...base, brand: theme.brand, font: theme.font }));
  };

  const save = () =>
    start(async () => {
      const res = await saveThemeAction(theme);
      if (res?.ok) {
        setSaved(theme);
        setRaw(theme);
        setMsg({ ok: true, text: "Guardado. Tu tienda ya usa este tema." });
      } else {
        setMsg({ ok: false, text: res?.error ?? "No se pudo guardar." });
      }
    });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── Controles ── */}
      <div className="space-y-6">
        <Section title="Paletas" desc="Un punto de partida; después puedes ajustar cada color.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEME_PRESETS.map((p) => {
              const active =
                p.theme.brand === theme.brand &&
                p.theme.bg === theme.bg &&
                p.theme.ink === theme.ink;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => set({ ...p.theme, font: theme.font })}
                  aria-pressed={active}
                  className={`rounded-xl border p-2.5 text-left transition hover:border-line-2 ${active ? "border-ink ring-1 ring-ink" : "border-line"}`}
                >
                  <span
                    className="flex h-10 items-center gap-1.5 rounded-lg px-2"
                    style={{ background: p.theme.bg, border: `1px solid ${p.theme.surface}` }}
                  >
                    <span className="h-5 w-5 rounded-full" style={{ background: p.theme.brand }} />
                    <span className="h-5 flex-1 rounded" style={{ background: p.theme.surface }} />
                    <span className="h-2 w-6 rounded-full" style={{ background: p.theme.ink }} />
                  </span>
                  <span className="mt-1.5 block text-xs font-medium text-ink-2">{p.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Colores">
          <div className="mb-4 inline-flex rounded-lg border border-line p-0.5 text-sm">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={theme.mode === m}
                className={`rounded-md px-4 py-1.5 font-medium ${theme.mode === m ? "bg-brand text-brand-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {m === "light" ? "Claro" : "Oscuro"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map((f) => (
              <ColorField
                key={f.key}
                label={f.label}
                hint={f.hint}
                value={raw[f.key]}
                onChange={(v) => set({ [f.key]: v } as Partial<ThemeInput>)}
              />
            ))}
          </div>
          {clamped.length > 0 && (
            <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
              Bajamos la saturación de{" "}
              {clamped.map((k) => COLOR_FIELDS.find((f) => f.key === k)!.label.toLowerCase()).join(", ")}{" "}
              para que no se vea neón. Se guardará como se ve en la vista previa.
            </p>
          )}
        </Section>

        <Section title="Tipografía" desc="Combinaciones pensadas para leerse bien en el celular.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(FONT_PAIRS) as FontKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set({ font: k })}
                aria-pressed={theme.font === k}
                className={`rounded-xl border px-3 py-3 text-left transition hover:border-line-2 ${theme.font === k ? "border-ink ring-1 ring-ink" : "border-line"}`}
              >
                <span className="block text-2xl font-bold text-ink" style={{ fontFamily: FONT_PAIRS[k].heading }}>
                  Aa
                </span>
                <span className="mt-1 block text-xs font-medium text-ink-2" style={{ fontFamily: FONT_PAIRS[k].body }}>
                  {FONT_PAIRS[k].name}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Legibilidad" desc="Contraste mínimo AA: 4,5 para texto y 3 para botones sobre el fondo.">
          <ul className="divide-y divide-line">
            {checks
              .filter((c) => c.blocking)
              .map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-ink-2">{c.label}</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${c.ok ? "text-ok-ink" : "text-bad-ink"}`}>
                    {c.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {c.ratio.toFixed(2)} : 1
                  </span>
                </li>
              ))}
          </ul>
          {modeMismatch(theme) && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-warn-ink">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              El fondo no corresponde al modo {theme.mode === "dark" ? "oscuro" : "claro"}; al ajustar se corrige.
            </p>
          )}
          {blocking.length > 0 && (
            <div className="mt-3 rounded-lg border border-bad/30 bg-bad-soft p-3 text-sm text-bad-ink">
              <p>
                Así no se lee bien: {blocking.map((c) => c.label.toLowerCase()).join(", ")}. No se
                puede guardar hasta corregirlo.
              </p>
              <button
                type="button"
                onClick={() => set(autoFixTheme(theme))}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-bad px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ajustar automáticamente
              </button>
            </div>
          )}
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || blocking.length > 0 || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => set(DEFAULT_THEME)}
            className="inline-flex items-center gap-2 rounded-lg border border-line-2 px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
          >
            <RotateCcw className="h-4 w-4" /> Restablecer tema por defecto
          </button>
          {msg && (
            <span role="status" className={`text-sm ${msg.ok ? "text-ok-ink" : "text-bad-ink"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── Vista previa en vivo (mismas variables que la tienda real) ── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
          Vista previa
        </p>
        <div
          data-testid="theme-preview"
          className="store-theme overflow-hidden rounded-2xl border border-line shadow-sm"
          style={themeStyle(theme)}
        >
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-ink">
                  <Store className="h-4 w-4" />
                </span>
              )}
              {storeName}
            </span>
            <span className="rounded-lg border border-line p-1.5 text-ink-2">
              <ShoppingCart className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-4 bg-bg p-4">
            <div className="flex gap-2 overflow-hidden">
              {["Todos", "Bebidas", "Hamburguesas"].map((c, i) => (
                <span
                  key={c}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${i === 0 ? "bg-brand text-brand-ink" : "bg-surface text-ink-2 ring-1 ring-line"}`}
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-ink">Hamburguesa de la casa</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                  Carne a la parrilla, queso y salsa de la casa.
                </p>
                <p className="mt-2 flex items-center gap-2">
                  <span className="font-extrabold text-ink">$22.000</span>
                  <span className="text-xs text-ink-4 line-through">$26.000</span>
                </p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-4">
                <UtensilsCrossed className="h-7 w-7" />
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink hover:bg-brand-hover"
            >
              Añadir al carrito
            </button>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-ok-soft px-2.5 py-1 font-medium text-ok-ink">Pagado</span>
              <span className="rounded-full bg-warn-soft px-2.5 py-1 font-medium text-warn-ink">Pendiente</span>
              <span className="font-medium text-brand-text">Ver detalles</span>
            </div>
            <p className="text-sm text-ink-2">
              Así se ve el texto secundario de tu tienda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-ink-3">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  // Si el color cambia desde fuera (paleta, ajuste), el texto lo sigue.
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  return (
    <label className="flex items-center gap-3 rounded-xl border border-line p-2.5">
      <input
        type="color"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent p-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block truncate text-xs text-ink-3">{hint}</span>
      </span>
      <input
        value={text}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (isHex(v)) onChange(v.toLowerCase());
        }}
        spellCheck={false}
        maxLength={7}
        aria-label={`${label} (hex)`}
        className="w-20 rounded-lg border border-line-2 px-2 py-1 font-mono text-xs uppercase outline-none focus:border-ink"
      />
    </label>
  );
}
