"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type BannerSlide = {
  imageUrl: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
};

// Banner de la tienda como slider: rota entre diapositivas (promociones).
// Con una sola diapositiva funciona como banner fijo.
export function BannerSlider({ slides }: { slides: BannerSlide[] }) {
  const [i, setI] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;

  return (
    <div className="relative mb-8 h-36 overflow-hidden rounded-2xl border border-gray-200 sm:h-44 md:h-52">
      {slides.map((s, idx) => (
        <Slide key={idx} slide={s} active={idx === i} />
      ))}

      {n > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Ir a la promoción ${idx + 1}`}
              className={`h-2 w-2 rounded-full transition ${
                idx === i ? "bg-white" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Slide({ slide, active }: { slide: BannerSlide; active: boolean }) {
  const cls = `absolute inset-0 transition-opacity duration-700 ${
    active ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  const inner = (
    <>
      {slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          alt={slide.title ?? "Promoción"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-[var(--brand)]" />
      )}

      {(slide.title || slide.subtitle) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-md px-6 sm:px-10">
              {slide.title && (
                <h2 className="text-xl font-bold text-white drop-shadow sm:text-2xl md:text-3xl">
                  {slide.title}
                </h2>
              )}
              {slide.subtitle && (
                <p className="mt-1 text-sm text-white/90 drop-shadow sm:text-base">
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  return slide.linkUrl ? (
    <Link href={slide.linkUrl} className={`block ${cls}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
