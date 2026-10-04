"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Play, X } from "lucide-react";
import type { AboutMedia } from "@/lib/about";
import { parseCoverVideo, videoPlayerSrc, videoThumb } from "@/lib/video";

type Filter = "all" | "image" | "video";

/**
 * Galería de la página Conócenos: fotos y videos en cuadrícula, con filtros.
 * Al tocar uno se abre en grande; los videos se reproducen con sonido y
 * controles. Flechas / Escape en el teclado.
 */
export function MediaGallery({ items, name }: { items: AboutMedia[]; name: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = filter === "all" ? items : items.filter((m) => m.kind === filter);
  const n = shown.length;
  const photos = items.filter((m) => m.kind === "image").length;
  const videos = items.length - photos;

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

  const current = open !== null ? shown[open] : null;

  return (
    <>
      {photos > 0 && videos > 0 && (
        <div role="group" aria-label="Filtrar galería" className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["all", `Todo (${items.length})`],
              ["image", `Fotos (${photos})`],
              ["video", `Videos (${videos})`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                filter === f
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <ul className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4">
        {shown.map((m, i) => (
          <li key={`${m.url}-${i}`} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${m.kind === "video" ? "Ver video" : "Ver foto"} ${i + 1} de ${n}${m.caption ? `: ${m.caption}` : ""}`}
              className="group relative block h-full w-full overflow-hidden rounded-2xl bg-black ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Tile media={m} name={name} />
              {m.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/70 backdrop-blur transition group-hover:scale-110 group-hover:bg-brand group-hover:text-brand-ink">
                    <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                  </span>
                </span>
              )}
              {m.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8 text-left text-sm font-medium text-white">
                  {m.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {current && open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${current.kind === "video" ? "Video" : "Foto"} ${open + 1} de ${n}`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="flex w-full max-w-5xl flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Viewer key={`${current.url}-${open}`} media={current} name={name} />
          </div>
          {current.caption && (
            <p className="mt-3 max-w-2xl text-center text-sm text-white/90" onClick={(e) => e.stopPropagation()}>
              {current.caption}
            </p>
          )}
          <p className="mt-2 text-xs text-white/60">
            <Images className="mr-1 inline h-3.5 w-3.5" />
            {open + 1} / {n}
          </p>
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
              <NavBtn side="left" label="Anterior" onClick={() => setOpen((open - 1 + n) % n)} />
              <NavBtn side="right" label="Siguiente" onClick={() => setOpen((open + 1) % n)} />
            </>
          )}
        </div>
      )}
    </>
  );
}

// Miniatura: la foto, el primer cuadro del video subido o la de YouTube.
function Tile({ media, name }: { media: AboutMedia; name: string }) {
  const cls = "h-full w-full object-cover transition duration-500 group-hover:scale-105";
  if (media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt={media.caption || `Foto de ${name}`} loading="lazy" decoding="async" className={cls} />;
  }
  const v = parseCoverVideo(media.url);
  if (v?.kind === "file") {
    return <video src={`${v.src}#t=0.5`} muted playsInline preload="metadata" className={cls} aria-hidden />;
  }
  const thumb = v ? videoThumb(v) : null;
  return thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={thumb} alt="" loading="lazy" className={cls} />
  ) : (
    <span className="block h-full w-full bg-gradient-to-br from-surface-3 to-black" />
  );
}

// En grande: foto completa o video con sonido y controles.
function Viewer({ media, name }: { media: AboutMedia; name: string }) {
  if (media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt={media.caption || `Foto de ${name}`} className="max-h-[78vh] max-w-full rounded-xl object-contain" />;
  }
  const v = parseCoverVideo(media.url);
  if (!v) return null;
  return v.kind === "file" ? (
    <video src={v.src} controls autoPlay playsInline className="max-h-[78vh] max-w-full rounded-xl bg-black" />
  ) : (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={videoPlayerSrc(v)}
        title={media.caption || `Video de ${name}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}

function NavBtn({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}
