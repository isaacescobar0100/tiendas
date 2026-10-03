"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConciergeBell, MapPin, UtensilsCrossed, X } from "lucide-react";

// Carta digital de SOLO LECTURA (QR de las mesas). Portada con la marca,
// pestañas de categoría que siguen el scroll y detalle del plato al tocarlo.
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
  open,
  sections,
}: {
  storeName: string;
  logoUrl: string | null;
  location: { name: string; address: string | null } | null;
  open: { isOpen: boolean; message: string | null } | null;
  sections: MenuSection[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef(new Map<string, HTMLAnchorElement>());
  // Mientras saltamos con una pestaña, el scroll no debe cambiar la activa.
  const jumping = useRef(false);

  // Pestaña activa según la sección visible.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (jumping.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

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

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    jumping.current = true;
    setActive(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
    window.setTimeout(() => (jumping.current = false), 700);
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

  return (
    <div className="min-h-screen bg-stone-100 pb-28">
      {/* Portada con el color de la marca */}
      <header className="relative overflow-hidden bg-[var(--brand)] px-5 pb-16 pt-12 text-center text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/25" />

        <div className="relative">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="mx-auto h-24 w-24 rounded-[28px] bg-white object-cover shadow-2xl ring-4 ring-white/20"
            />
          ) : (
            <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15 shadow-2xl ring-4 ring-white/20">
              <UtensilsCrossed className="h-10 w-10" />
            </span>
          )}
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
            Menú digital
          </p>
          <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-tight">
            {storeName}
          </h1>

          {(location || open) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
              {location && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                  <MapPin className="h-3.5 w-3.5" />
                  {location.name}
                </span>
              )}
              {open && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                  <span
                    className={`h-2 w-2 rounded-full ${open.isOpen ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.3)]" : "bg-amber-400"}`}
                  />
                  {open.isOpen ? "Abierto ahora" : "Cerrado"}
                  {open.message ? ` · ${open.message}` : ""}
                </span>
              )}
            </div>
          )}
          {location?.address && (
            <p className="mt-2 text-xs text-white/60">{location.address}</p>
          )}
        </div>
      </header>

      {/* Hoja que se monta sobre la portada */}
      <div className="relative -mt-8 rounded-t-[32px] bg-stone-100 pt-2">
        {sections.length === 0 ? (
          <p className="px-6 py-20 text-center text-gray-500">
            Estamos actualizando la carta. Pregunta a tu mesero.
          </p>
        ) : (
          <>
            {/* Pestañas de categoría */}
            <div className="sticky top-0 z-20 bg-stone-100/90 backdrop-blur-md">
              <div
                ref={navRef}
                className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {sections.map((s) => {
                  const isActive = s.id === active;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      onClick={jumpTo(s.id)}
                      ref={(el) => {
                        if (el) pillRefs.current.set(s.id, el);
                      }}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-[var(--brand)] text-white shadow-md"
                          : "bg-white text-gray-600 shadow-sm ring-1 ring-black/5 hover:text-gray-900"
                      }`}
                    >
                      {s.name}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-9 px-4 pt-4">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="mb-3 flex items-baseline gap-2 px-1">
                    <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
                      {s.name}
                    </h2>
                    <span className="text-sm font-medium text-gray-400">
                      {s.items.length}
                    </span>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {s.items.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="group flex h-full w-full gap-3 rounded-3xl bg-white p-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] transition hover:shadow-lg active:scale-[0.985]"
                        >
                          <div className="flex min-w-0 flex-1 flex-col py-1 pl-1">
                            <h3 className="text-[15px] font-bold leading-snug text-gray-900">
                              {p.name}
                            </h3>
                            {p.description && (
                              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500">
                                {p.description}
                              </p>
                            )}
                            <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
                              <span className="text-[15px] font-extrabold text-gray-900">
                                {p.price}
                              </span>
                              {p.oldPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  {p.oldPrice}
                                </span>
                              )}
                              {p.groups.length > 0 && (
                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                  Personalizable
                                </span>
                              )}
                            </div>
                          </div>
                          {p.imageUrl && (
                            <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-2xl bg-stone-100">
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
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
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
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-900/90 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur">
          <ConciergeBell className="h-4 w-4 text-amber-300" />
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
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur"
            >
              <X className="h-5 w-5" />
            </button>
            {selected.imageUrl && (
              <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100">
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
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900">
                  {selected.name}
                </h2>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold text-gray-900">{selected.price}</p>
                  {selected.oldPrice && (
                    <p className="text-sm text-gray-400 line-through">{selected.oldPrice}</p>
                  )}
                </div>
              </div>
              {selected.description && (
                <p className="mt-3 leading-relaxed text-gray-600">{selected.description}</p>
              )}

              {selected.groups.map((g) => (
                <div key={g.name} className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    {g.name}
                  </p>
                  <ul className="mt-2 divide-y divide-gray-100 rounded-2xl bg-stone-50 px-4">
                    {g.options.map((o) => (
                      <li key={o.name} className="flex justify-between gap-3 py-2.5 text-sm">
                        <span className="text-gray-700">{o.name}</span>
                        {o.price && (
                          <span className="font-semibold text-gray-900">+{o.price}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <button
                type="button"
                onClick={close}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] py-4 font-semibold text-white shadow-lg transition hover:brightness-110"
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
