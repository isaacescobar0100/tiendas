"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { ImageFramer } from "@/components/image-framer";

export type GalleryItem = { url: string; position: string; zoom: number };

export function MultiImageUpload({
  name = "gallery",
  defaultItems = [],
  label = "Imágenes adicionales (galería)",
}: {
  name?: string;
  defaultItems?: GalleryItem[];
  label?: string;
}) {
  const [items, setItems] = useState<GalleryItem[]>(defaultItems);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const optimized = await compressImage(file);
        const fd = new FormData();
        fd.append("file", optimized);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? `Error al subir (${res.status}).`);
        }
        setItems((prev) => [
          ...prev,
          { url: data.url, position: "50% 50%", zoom: 1 },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function updateItem(idx: number, position: string, zoom: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, position, zoom } : it)),
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="flex flex-wrap gap-4">
        {items.map((item, idx) => (
          <div key={item.url + idx} className="relative">
            <ImageFramer
              url={item.url}
              position={item.position}
              zoom={item.zoom}
              onChange={(pos, z) => updateItem(idx, pos, z)}
              size="h-28 w-28"
            />
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.filter((_, i) => i !== idx))
              }
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow hover:text-red-500"
              aria-label="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-28 w-28 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-900 hover:text-gray-700 disabled:opacity-60"
        >
          {uploading ? "Subiendo…" : "+ Añadir"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />
      <p className="mt-1 text-xs text-gray-400">
        Se muestran junto a la principal. Arrastra cada una y usa −/+ para
        encuadrarla. Se optimizan solas al subir.
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
