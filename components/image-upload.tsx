"use client";

import { useRef, useState } from "react";

export function ImageUpload({
  name = "imageUrl",
  defaultUrl,
  label = "Imagen",
  aspect = "square",
}: {
  name?: string;
  defaultUrl?: string | null;
  label?: string;
  aspect?: "square" | "wide";
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir.");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Guarda la URL final para que la envíe el formulario */}
      <input type="hidden" name={name} value={url} />

      <div className="flex items-start gap-4">
        <div
          className={`overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${
            aspect === "square" ? "h-24 w-24" : "h-16 w-28"
          }`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
              🖼️
            </div>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? "Subiendo…" : url ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {url && !uploading && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="ml-2 text-sm text-gray-400 hover:text-red-500"
            >
              Quitar
            </button>
          )}
          <p className="text-xs text-gray-400">JPG, PNG, WEBP o GIF · máx 5 MB</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
