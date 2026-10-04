"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { ABOUT_LIMITS as L, type StoreAbout, type SocialKey } from "@/lib/about";
import { saveAboutAction, type AboutState } from "./actions";
import { GalleryEditor } from "./gallery-editor";

type ListKey = "values" | "phones" | "emails" | "faqs" | "highlights";

const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@surenosclub o https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "surenosclub o https://facebook.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "@surenosclub" },
  { key: "youtube", label: "YouTube", placeholder: "@surenosclub" },
  { key: "website", label: "Sitio web", placeholder: "surenosclub.com" },
];

/**
 * Editor de la página "Conócenos". Todo el contenido viaja como un JSON y el
 * servidor lo limpia (lib/about.ts). Si hay error no se pierde lo escrito.
 */
export function AboutForm({ initial, publicUrl }: { initial: StoreAbout; publicUrl: string }) {
  const [a, setA] = useState<StoreAbout>(initial);
  const [state, setState] = useState<AboutState>();
  const [pending, start] = useTransition();

  const set = <K extends keyof StoreAbout>(k: K, v: StoreAbout[K]) => {
    setA((p) => ({ ...p, [k]: v }));
    setState(undefined);
  };
  // Listas: editar, añadir y quitar filas.
  const edit = <K extends ListKey>(
    k: K,
    i: number,
    patch: Partial<StoreAbout[K][number]>,
  ) => set(k, a[k].map((row, j) => (j === i ? { ...row, ...patch } : row)) as StoreAbout[K]);
  const remove = <K extends ListKey>(k: K, i: number) =>
    set(k, a[k].filter((_, j) => j !== i) as StoreAbout[K]);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setState(await saveAboutAction(JSON.stringify(a))));
      }}
    >
      {/* Publicación */}
      <Card title="Publicación" desc="Cuando está activa, la portada de tu tienda muestra un botón que lleva a esta página.">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-ink">Mostrar la página en mi tienda</span>
            <span className="block text-xs text-ink-3">
              {a.enabled ? "Visible para tus clientes." : "Oculta: solo tú la ves aquí."}
            </span>
          </span>
          <input
            type="checkbox"
            checked={a.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="h-5 w-5 accent-brand"
          />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Text label="Texto del botón en la portada" value={a.ctaLabel} max={L.ctaLabel} placeholder="Conócenos" onChange={(v) => set("ctaLabel", v)} />
          <div className="flex items-end">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
            >
              <ExternalLink className="h-4 w-4" /> Ver la página
            </a>
          </div>
        </div>
      </Card>

      <Card title="Bienvenida" desc="Lo primero que se lee, sobre el video o la foto de tu portada.">
        <Text label="Título" value={a.headline} max={L.headline} placeholder="Bienvenidos a Sureños Club" onChange={(v) => set("headline", v)} />
        <Text label="Frase corta" value={a.intro} max={L.intro} placeholder="Comida rápida hecha con cariño desde 2015" onChange={(v) => set("intro", v)} />
      </Card>

      <Card title="Quiénes somos" desc="Cuenta su historia: cómo empezaron, qué los hace distintos. Puedes usar varios párrafos.">
        <Area label="Nuestra historia" value={a.story} max={L.story} rows={6} onChange={(v) => set("story", v)} />
        <div className="space-y-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink-2">Datos destacados (opcional)</h3>
          <p className="-mt-2 text-xs text-ink-3">
            Cifras que se muestran en grande junto a la historia. Ej: «3» sedes, «+10» años, «2015» año de fundación.
          </p>
          {a.highlights.map((h, i) => (
            <Row key={i} onRemove={() => remove("highlights", i)} label={`Dato ${i + 1}`}>
              <Text label="Cifra" value={h.value} max={L.highlightValue} placeholder="+10" onChange={(x) => edit("highlights", i, { value: x })} />
              <Text label="Qué significa" value={h.label} max={L.highlightLabel} placeholder="años sirviendo al barrio" onChange={(x) => edit("highlights", i, { label: x })} />
            </Row>
          ))}
          <AddButton disabled={a.highlights.length >= L.highlights} onClick={() => set("highlights", [...a.highlights, { value: "", label: "" }])}>
            Añadir dato
          </AddButton>
        </div>
      </Card>

      <Card title="Galería de fotos y videos" desc="Va justo debajo de «Quiénes somos». Tus clientes la ven en grande y los videos suenan.">
        <GalleryEditor
          items={a.gallery}
          update={(fn) => {
            setA((p) => ({ ...p, gallery: fn(p.gallery) }));
            setState(undefined);
          }}
        />
      </Card>

      <Card title="Misión y visión">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <Area label="Misión" value={a.mission} max={L.mission} rows={5} placeholder="Lo que hacemos cada día y para quién…" onChange={(v) => set("mission", v)} />
          <Area label="Visión" value={a.vision} max={L.vision} rows={5} placeholder="Hacia dónde vamos…" onChange={(v) => set("vision", v)} />
        </div>
      </Card>

      <Card title="Nuestros valores" desc={`Hasta ${L.values}. Ej: «Calidad — ingredientes frescos todos los días».`}>
        {a.values.map((v, i) => (
          <Row key={i} onRemove={() => remove("values", i)} label={`Valor ${i + 1}`}>
            <Text label="Valor" value={v.title} max={L.valueTitle} placeholder="Calidad" onChange={(x) => edit("values", i, { title: x })} />
            <Text label="Descripción" value={v.text} max={L.valueText} placeholder="Ingredientes frescos todos los días" onChange={(x) => edit("values", i, { text: x })} />
          </Row>
        ))}
        <AddButton disabled={a.values.length >= L.values} onClick={() => set("values", [...a.values, { title: "", text: "" }])}>
          Añadir valor
        </AddButton>
      </Card>

      <Card title="Contacto" desc="Teléfonos y correos con su uso: domicilios, eventos, publicidad, trabajo…">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-2">Teléfonos</h3>
          {a.phones.map((p, i) => (
            <Row key={i} onRemove={() => remove("phones", i)} label={`Teléfono ${i + 1}`}>
              <Text label="Para qué" value={p.label} max={L.label} placeholder="Domicilios" onChange={(x) => edit("phones", i, { label: x })} />
              <Text label="Número" value={p.number} max={30} type="tel" placeholder="300 123 4567" onChange={(x) => edit("phones", i, { number: x })} />
            </Row>
          ))}
          <AddButton disabled={a.phones.length >= L.phones} onClick={() => set("phones", [...a.phones, { label: "", number: "" }])}>
            Añadir teléfono
          </AddButton>
        </div>
        <div className="space-y-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink-2">Correos</h3>
          {a.emails.map((m, i) => (
            <Row key={i} onRemove={() => remove("emails", i)} label={`Correo ${i + 1}`}>
              <Text label="Para qué" value={m.label} max={L.label} placeholder="Publicidad y alianzas" onChange={(x) => edit("emails", i, { label: x })} />
              <Text label="Correo" value={m.email} max={254} type="email" placeholder="publicidad@surenos.com" onChange={(x) => edit("emails", i, { email: x })} />
            </Row>
          ))}
          <AddButton disabled={a.emails.length >= L.emails} onClick={() => set("emails", [...a.emails, { label: "", email: "" }])}>
            Añadir correo
          </AddButton>
        </div>
      </Card>

      <Card title="Redes sociales" desc="Escribe el usuario (@…) o pega el enlace. Las vacías no se muestran.">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <Text
              key={f.key}
              label={f.label}
              value={a.socials[f.key]}
              max={200}
              placeholder={f.placeholder}
              onChange={(v) => set("socials", { ...a.socials, [f.key]: v })}
            />
          ))}
        </div>
      </Card>

      <Card title="Preguntas frecuentes" desc={`Hasta ${L.faqs}. Ej: «¿Hacen domicilios?», «¿Atienden eventos?».`}>
        {a.faqs.map((f, i) => (
          <Row key={i} onRemove={() => remove("faqs", i)} label={`Pregunta ${i + 1}`} stacked>
            <Text label="Pregunta" value={f.q} max={L.faqQ} onChange={(x) => edit("faqs", i, { q: x })} />
            <Area label="Respuesta" value={f.a} max={L.faqA} rows={3} onChange={(x) => edit("faqs", i, { a: x })} />
          </Row>
        ))}
        <AddButton disabled={a.faqs.length >= L.faqs} onClick={() => set("faqs", [...a.faqs, { q: "", a: "" }])}>
          Añadir pregunta
        </AddButton>
      </Card>

      <p className="text-xs text-ink-3">
        La página también muestra sola: tu video o foto de portada (Ajustes › Portada), las fotos del
        negocio (Apariencia, se suman a la galería), tus sedes (Sedes) y el horario (Ajustes › Horario).
      </p>

      {/* Barra de guardado: siempre a mano */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar página"}
          </button>
          {state?.error && (
            <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
              {state.error}
            </p>
          )}
          {state?.ok && (
            <p role="status" className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
              <Check className="h-4 w-4" /> {state.ok}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-ink-3">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  onRemove,
  stacked = false,
  children,
}: {
  label: string;
  onRemove: () => void;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className={stacked ? "space-y-3" : "grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"}>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${label.toLowerCase()}`}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-bad-ink hover:underline"
      >
        <Trash2 className="h-3.5 w-3.5" /> Quitar
      </button>
    </div>
  );
}

function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-2 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50"
    >
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink";

function Text({
  label,
  value,
  max,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-medium text-ink-2">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

function Area({
  label,
  value,
  max,
  rows,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  rows: number;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium text-ink-2">
        {label}
        <span className="text-xs font-normal text-ink-4">
          {value.length}/{max}
        </span>
      </span>
      <textarea
        value={value}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-y`}
      />
    </label>
  );
}
