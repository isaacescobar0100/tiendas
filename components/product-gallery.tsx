"use client";

import { useState } from "react";

export function ProductGallery({
  images,
  alt,
  mainPosition = "50% 50%",
}: {
  images: string[];
  alt: string;
  mainPosition?: string;
}) {
  const pics = images.length > 0 ? images : ["https://placehold.co/600x600?text=Producto"];
  const [active, setActive] = useState(0);
  const current = pics[Math.min(active, pics.length - 1)];

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={alt}
          // El punto focal solo aplica a la imagen principal (índice 0).
          style={{ objectPosition: active === 0 ? mainPosition : "50% 50%" }}
          className="aspect-square w-full object-cover"
        />
      </div>

      {pics.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {pics.map((src, idx) => (
            <button
              key={src + idx}
              type="button"
              onClick={() => setActive(idx)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                idx === active
                  ? "border-gray-900 ring-1 ring-gray-900"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
