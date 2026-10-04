"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { StorePhoto } from "@/lib/store-photos";
import { StorePhotoImg } from "@/components/store-photo";

/** Fotos del negocio: al tocar una se abre en grande y se pasa con flechas. */
export function PhotoGallery({ photos, name }: { photos: StorePhoto[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = photos.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % n));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + n) % n));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, n]);

  return (
    <>
      <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
        {photos.map((ph, i) => (
          <button
            key={ph.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Ver foto ${i + 1} de ${n} en grande`}
            className={`group relative overflow-hidden rounded-2xl ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              i === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            <StorePhotoImg
              photo={ph}
              alt={`Foto de ${name}`}
              className="h-full w-full transition duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${open + 1} de ${n}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open].url}
            alt={`Foto de ${name}`}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(null)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          {n > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + n) % n);
                }}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % n);
                }}
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {open + 1} / {n}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
