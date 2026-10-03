"use client";

import { useState } from "react";

export type GalleryPic = { url: string; position: string; zoom: number };

export function ProductGallery({
  items,
  alt,
}: {
  items: GalleryPic[];
  alt: string;
}) {
  const pics: GalleryPic[] =
    items.length > 0
      ? items
      : [
          {
            url: "https://placehold.co/600x600?text=Producto",
            position: "50% 50%",
            zoom: 1,
          },
        ];
  const [active, setActive] = useState(0);
  const current = pics[Math.min(active, pics.length - 1)];

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={alt}
          style={{
            objectPosition: current.position,
            transform: `scale(${current.zoom})`,
          }}
          className="aspect-square w-full object-cover"
        />
      </div>

      {pics.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {pics.map((pic, idx) => (
            <button
              key={pic.url + idx}
              type="button"
              onClick={() => setActive(idx)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                idx === active
                  ? "border-ink ring-1 ring-ink"
                  : "border-line hover:border-line-2"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pic.url}
                alt=""
                style={{
                  objectPosition: pic.position,
                  transform: `scale(${pic.zoom})`,
                }}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
