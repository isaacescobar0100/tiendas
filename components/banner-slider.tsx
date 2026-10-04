"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { parseCoverVideo, type CoverVideo } from "@/lib/video";

export type BannerSlide = {
  imageUrl: string | null;
  imagePosition?: string | null;
  imageZoom?: number | null;
  videoUrl?: string | null; // video subido, YouTube o Vimeo (reemplaza a la imagen)
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  ctaLabel?: string | null; // texto del botón (por defecto "Ver oferta")
};

// Portada de la tienda como slider: la portada (foto o video) y las
// promociones. Las fotos rotan solas; un video se queda hasta que la persona
// pase de diapositiva. Los videos empiezan en silencio (los navegadores no
// permiten arrancar con sonido) y tienen un botón para activarlo.
export function BannerSlider({ slides }: { slides: BannerSlide[] }) {
  const [i, setI] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const n = slides.length;
  const current = slides[i];
  const currentIsVideo = !!(current && parseCoverVideo(current.videoUrl));

  // Auto-avance solo en fotos (un video no se corta a la mitad).
  useEffect(() => {
    if (n <= 1 || currentIsVideo) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, currentIsVideo]);

  if (n === 0) return null;
  const go = (to: number) => {
    setSoundOn(false); // al cambiar de diapositiva, silencio
    setI(((to % n) + n) % n);
  };

  return (
    <div className="relative mb-8 h-[240px] overflow-hidden rounded-2xl border border-line bg-black [container-type:size] sm:h-[340px] md:h-[440px]">
      {slides.map((s, idx) => (
        <Slide
          key={idx}
          slide={s}
          active={idx === i}
          priority={idx === 0}
          soundOn={soundOn && idx === i}
          onToggleSound={() => setSoundOn((v) => !v)}
        />
      ))}

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(i - 1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(i + 1)}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => go(idx)}
                aria-label={`Ir a la diapositiva ${idx + 1}`}
                aria-current={idx === i ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Slide({
  slide,
  active,
  priority,
  soundOn,
  onToggleSound,
}: {
  slide: BannerSlide;
  active: boolean;
  priority: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const video = parseCoverVideo(slide.videoUrl);
  const hasText = !!(slide.title || slide.subtitle || slide.linkUrl);
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!active}
    >
      {/* Fondo: foto (también de respaldo mientras carga el video) */}
      {slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          alt={slide.title ?? "Promoción"}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          style={{ objectPosition: slide.imagePosition ?? "50% 50%", transform: `scale(${slide.imageZoom ?? 1})` }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        !video && <div className="absolute inset-0 bg-brand" />
      )}

      {video && active && <SlideVideo video={video} soundOn={soundOn} />}

      {(hasText || video) && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 sm:bg-gradient-to-r sm:from-black/65 sm:via-black/25 sm:to-transparent" />
      )}

      {hasText && (
        <div className="absolute inset-0 flex items-end sm:items-center">
          <div className="max-w-lg px-6 pb-10 sm:px-12 sm:pb-0">
            {slide.title && (
              <h2 className="text-2xl font-extrabold leading-tight text-white drop-shadow sm:text-4xl md:text-5xl">
                {slide.title}
              </h2>
            )}
            {slide.subtitle && (
              <p className="mt-2 text-sm text-white drop-shadow sm:text-base">{slide.subtitle}</p>
            )}
            {slide.linkUrl && (
              <Link
                href={slide.linkUrl}
                tabIndex={active ? 0 : -1}
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink shadow-lg transition hover:bg-brand-hover"
              >
                {slide.ctaLabel || "Ver oferta"} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {video && active && (
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75 sm:bottom-4 sm:right-4 sm:text-sm"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundOn ? "Silenciar" : "Activar sonido"}
        </button>
      )}
    </div>
  );
}

// Video de la diapositiva. Archivo: <video>. YouTube/Vimeo: su reproductor,
// recortado para cubrir, y el sonido se controla con su API de mensajes.
function SlideVideo({ video, soundOn }: { video: CoverVideo; soundOn: boolean }) {
  const fileRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (video.kind === "file") {
      const v = fileRef.current;
      if (!v) return;
      v.muted = !soundOn;
      if (soundOn) {
        v.volume = 1;
        void v.play().catch(() => {});
      }
      return;
    }
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    if (video.kind === "youtube") {
      const cmd = (func: string, args: unknown[] = []) =>
        w.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube-nocookie.com");
      if (soundOn) {
        cmd("unMute");
        cmd("setVolume", [100]);
        cmd("playVideo");
      } else cmd("mute");
    } else {
      const send = (method: string, value?: unknown) =>
        w.postMessage(JSON.stringify({ method, value }), "https://player.vimeo.com");
      send("setMuted", !soundOn);
      if (soundOn) send("setVolume", 1);
    }
  }, [soundOn, video.kind, video.src]);

  return video.kind === "file" ? (
    <video
      ref={fileRef}
      src={video.src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full object-cover"
    />
  ) : (
    <iframe
      ref={frameRef}
      src={video.src}
      title="Video de portada"
      allow="autoplay; encrypted-media; picture-in-picture"
      tabIndex={-1}
      className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 border-0"
    />
  );
}
