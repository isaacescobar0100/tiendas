"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ALL = "__todos__";
import { ConciergeBell, MapPin, UtensilsCrossed, X, Armchair } from "lucide-react";
import type { StorePhoto } from "@/lib/store-photos";
import { StorePhotoImg } from "@/components/store-photo";

// Carta digital de SOLO LECTURA (QR de las mesas). Portada con la marca,
// filtro por categoría ("Todos" o una sola) y detalle del plato al tocarlo.
// No hay carrito ni compra: en el local se pide al mesero.

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  oldPrice: string | null;
  discount: number | null; // % de descuento si está en oferta
  imageUrl: string | null;
  imagePosition: string;
  imageZoom: number;
  groups: { name: string; options: { name: string; price: string | null }[] }[];
};

export type MenuSection = { id: string; name: string; items: MenuItem[] };

export function MenuView({
  storeName,
  logoUrl,
  location,
  table = null,
  open,
  sections,
  cover = null,
}: {
  storeName: string;
  logoUrl: string | null;
  location: { name: string; address: string | null } | null;
  table?: string | null; // mesa del QR ("Mesa 1")
  open: { isOpen: boolean; message: string | null } | null;
  sections: MenuSection[];
  cover?: StorePhoto | null;
}) {
  const [active, setActive] = useState(ALL);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef(new Map<string, HTMLButtonElement>());

  const visible = active === ALL ? sections : sections.filter((s) => s.id === active);
  const tabs = [{ id: ALL, name: "Todos" }, ...sections.map((s) => ({ id: s.id, name: s.name }))];

  // Mantiene visible la pestaña activa dentro de la barra.
  useEffect(() => {
    const pill = pillRefs.current.get(active);
    const nav = navRef.current;
    if (!pill || !nav) return;
    nav.scrollTo({
      left: pill.offsetLeft - nav.clientWidth / 2 + pill.clientWidth / 2,
      behavior: "smooth",
    });
  }, [active]);

  // Al cambiar de filtro, si ya se había bajado, vuelve al inicio de la lista.
  const pick = (id: string) => {
    setActive(id);
    const list = listRef.current;
    if (list && list.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: list.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
    }
  };

  const close = useCallback(() => setSelected(null), []);

  // Detalle abierto: bloquea el scroll de fondo y cierra con Escape.
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected, close]);

  const chip = cover ? "bg-white/15 ring-1 ring-white/20" : "bg-brand-ink/15";

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Portada: foto del negocio de fondo (Apariencia) o el color de la marca.
          Con foto, una capa oscura y texto blanco: se lee sea cual sea la foto. */}
      <header
        className={`relative overflow-hidden bg-brand px-5 text-center ${cover ? "pb-24 pt-16 text-white sm:pb-32 sm:pt-24" : "pb-16 pt-12 text-brand-ink"}`}
      >
        {cover ? (
          <>
            <StorePhotoImg photo={cover} alt="" eager className="absolute inset-0 h-full w-full" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/60 to-black/80" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-ink/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-brand-ink/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/25" />
          </>
        )}

        <div className="relative">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className={`mx-auto h-24 w-24 rounded-[28px] bg-surface object-cover shadow-2xl ring-4 ${cover ? "ring-white/25" : "ring-brand-ink/20"}`}
            />
          ) : (
            <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-brand-ink/15 shadow-2xl ring-4 ring-brand-ink/20">
              <UtensilsCrossed className="h-10 w-10" />
            </span>
          )}
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em]">
            Menú digital
          </p>
          <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-tight">
            {storeName}
          </h1>

          {table && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-2xl bg-surface px-5 py-2 text-lg font-extrabold text-ink shadow-lg">
              <Armchair className="h-5 w-5 text-brand-text" aria-hidden />
              {table}
            </p>
          )}
          {(location || open) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
              {location && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur ${chip}`}>
                  <MapPin className="h-3.5 w-3.5" />
                  {location.name}
                </span>
              )}
              {open && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur ${chip}`}>
                  <span
                    className={`h-2 w-2 rounded-full ${open.isOpen ? "bg-ok shadow-[0_0_0_3px_rgba(52,211,153,0.3)]" : "bg-warn"}`}
                  />
                  {open.isOpen ? "Abierto ahora" : "Cerrado"}
                  {open.message ? ` · ${open.message}` : ""}
                </span>
              )}
            </div>
          )}
          {location?.address && (
            <p className="mt-2 text-xs">{location.address}</p>
          )}
        </div>
      </header>

      {/* Hoja que se monta sobre la portada */}
      <div className="relative -mt-8 rounded-t-[32px] bg-bg pt-2">
        {sections.length === 0 ? (
          <p className="px-6 py-20 text-center text-ink-3">
            Estamos actualizando la carta. Pregunta a tu mesero.
          </p>
        ) : (
          <>
            {/* Pestañas de categoría */}
            <div className="sticky top-0 z-20 bg-bg/90 backdrop-blur-md">
              <div
                ref={navRef}
                className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {tabs.map((s) => {
                  const isActive = s.id === active;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pick(s.id)}
                      aria-pressed={isActive}
                      ref={(el) => {
                        if (el) pillRefs.current.set(s.id, el);
                      }}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand text-brand-ink shadow-md"
                          : "bg-surface text-ink-2 shadow-sm ring-1 ring-line/5 hover:text-ink"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={listRef} className="mx-auto max-w-6xl space-y-9 px-4 pt-4">
              {visible.map((s) => (
                <section key={s.id} id={s.id}>
                  <div className="mb-3 flex items-baseline gap-2 px-1">
                    <h2 className="text-xl font-extrabold tracking-tight text-ink">
                      {s.name}
                    </h2>
                    <span className="text-sm font-medium text-ink-3">
                      {s.items.length}
                    </span>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {s.items.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="group flex h-full w-full gap-3 rounded-3xl bg-surface p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-line/[0.04] transition hover:shadow-lg active:scale-[0.985]"
                        >
                          <div className="flex min-w-0 flex-1 flex-col py-1 pl-1">
                            <h3 className="text-[15px] font-bold leading-snug text-ink">
                              {p.name}
                            </h3>
                            {p.description && (
                              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-3">
                                {p.description}
                              </p>
                            )}
                            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
                              <span className="text-[15px] font-extrabold text-ink">
                                {p.price}
                              </span>
                              {p.oldPrice && (
                                <span className="text-xs text-ink-3 line-through">
                                  {p.oldPrice}
                                </span>
                              )}
                              {p.groups.length > 0 && (
                                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-3">
                                  Personalizable
                                </span>
                              )}
                            </div>
                          </div>
                          {p.imageUrl && (
                            <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-2xl bg-surface-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                style={{
                                  objectPosition: p.imagePosition,
                                  transform: `scale(${p.imageZoom})`,
                                }}
                              />
                              {p.discount && (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-bad px-2 py-0.5 text-[11px] font-bold text-white shadow">
                                  -{p.discount}%
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recordatorio fijo: en el local se pide al mesero */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-ink/90 px-5 py-3 text-sm font-medium text-bg shadow-2xl backdrop-blur">
          <ConciergeBell className="h-4 w-4 opacity-80" />
          Para pedir, llama a tu mesero
        </div>
      </div>

      {/* Detalle del plato */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-surface shadow-2xl sm:rounded-[32px]"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg backdrop-blur"
            >
              <X className="h-5 w-5" />
            </button>
            {selected.imageUrl && (
              <div className="aspect-[4/3] w-full overflow-hidden bg-surface-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.imageUrl}
                  alt={selected.name}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: selected.imagePosition,
                    transform: `scale(${selected.imageZoom})`,
                  }}
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink">
                  {selected.name}
                </h2>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold text-ink">{selected.price}</p>
                  {selected.oldPrice && (
                    <p className="text-sm text-ink-3 line-through">{selected.oldPrice}</p>
                  )}
                </div>
              </div>
              {selected.description && (
                <p className="mt-3 leading-relaxed text-ink-2">{selected.description}</p>
              )}

              {selected.groups.map((g) => (
                <div key={g.name} className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-3">
                    {g.name}
                  </p>
                  <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface-2 px-4">
                    {g.options.map((o) => (
                      <li key={o.name} className="flex justify-between gap-3 py-2.5 text-sm">
                        <span className="text-ink-2">{o.name}</span>
                        {o.price && (
                          <span className="font-semibold text-ink">+{o.price}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <button
                type="button"
                onClick={close}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-semibold text-brand-ink shadow-lg transition hover:brightness-110"
              >
                <ConciergeBell className="h-5 w-5" /> Pídelo a tu mesero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
