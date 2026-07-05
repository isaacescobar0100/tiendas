"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { compressImage } from "@/lib/image-compress";

export function MultiImageUpload({
  name = "images",
  defaultUrls = [],
  label = "Imágenes adicionales (galería)",
}: {
  name?: string;
  defaultUrls?: string[];
  label?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
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
        setUrls((prev) => [...prev, data.url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div className="flex flex-wrap gap-3">
        {urls.map((url, idx) => (
          <div
            key={url + idx}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((_, i) => i !== idx))}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-gray-600 hover:text-red-500"
              aria-label="Quitar imagen"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-900 hover:text-gray-700 disabled:opacity-60"
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
        Se muestran junto a la principal en el detalle. Se optimizan solas al
        subir. JPG, PNG, WEBP o GIF.
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
