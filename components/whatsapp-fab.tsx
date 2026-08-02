"use client";

import { useEffect, useState } from "react";
import { normalizeWhatsapp } from "@/lib/whatsapp";

type Target = { name: string; number: string };

function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.258.594 4.46 1.72 6.402L3.2 28.8l6.57-1.72a12.74 12.74 0 006.233 1.588h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.8-12.668zm0 23.36h-.004a10.6 10.6 0 01-5.4-1.48l-.387-.23-4.02 1.053 1.073-3.92-.252-.402a10.56 10.56 0 01-1.62-5.64c0-5.85 4.76-10.61 10.614-10.61 2.835 0 5.5 1.105 7.504 3.11a10.54 10.54 0 013.107 7.507c0 5.85-4.76 10.612-10.61 10.612zm5.82-7.947c-.32-.16-1.888-.932-2.18-1.038-.292-.106-.505-.16-.718.16-.213.32-.824 1.038-1.01 1.25-.186.213-.372.24-.692.08-.32-.16-1.35-.498-2.57-1.586-.95-.847-1.59-1.893-1.776-2.213-.186-.32-.02-.492.14-.652.144-.143.32-.372.48-.558.16-.186.213-.32.32-.532.106-.213.053-.4-.027-.56-.08-.16-.717-1.73-.983-2.37-.258-.62-.52-.536-.717-.546l-.61-.01c-.213 0-.56.08-.852.4-.292.32-1.117 1.09-1.117 2.66s1.144 3.084 1.303 3.297c.16.213 2.25 3.436 5.45 4.818.762.33 1.356.526 1.82.674.765.243 1.46.209 2.01.127.613-.092 1.888-.772 2.154-1.518.266-.746.266-1.386.186-1.518-.08-.133-.293-.213-.613-.373z" />
    </svg>
  );
}

// Botón flotante de WhatsApp. Con varias sedes, deja elegir a cuál escribir.
export function WhatsappFab({
  whatsapp,
  storeName,
  locations = [],
}: {
  whatsapp?: string | null;
  storeName: string;
  locations?: { name: string; whatsapp: string | null }[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const fromLocations: Target[] = locations
    .map((l) => ({ name: l.name, number: normalizeWhatsapp(l.whatsapp) }))
    .filter((t) => t.number.length >= 10);

  const single = normalizeWhatsapp(whatsapp);
  const targets: Target[] =
    fromLocations.length > 0
      ? fromLocations
      : single.length >= 10
        ? [{ name: storeName, number: single }]
        : [];

  if (targets.length === 0) return null;

  const text = `Hola ${storeName}, quiero hacer un pedido.`;
  const link = (n: string) =>
    `https://wa.me/${n}?text=${encodeURIComponent(text)}`;

  const fab =
    "flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105 hover:shadow-xl";

  // Un solo destino → enlace directo.
  if (targets.length === 1) {
    return (
      <a
        href={link(targets[0].number)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className={`fixed bottom-5 right-5 z-40 ${fab}`}
      >
        <WaIcon className="h-8 w-8 fill-white" />
      </a>
    );
  }

  // Varias sedes → menú para elegir.
  return (
    <>
      {open && (
        <button
          type="button"
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
        />
      )}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
        {open && (
          <div className="mb-3 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-500">
              ¿A qué sede quieres escribir?
            </div>
            {targets.map((t) => (
              <a
                key={t.number}
                href={link(t.number)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <WaIcon className="h-5 w-5 shrink-0 fill-[#25D366]" />
                {t.name}
              </a>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Escríbenos por WhatsApp"
          aria-expanded={open}
          className={fab}
        >
          <WaIcon className="h-8 w-8 fill-white" />
        </button>
      </div>
    </>
  );
}
