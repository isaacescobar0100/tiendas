"use client";

import { useRef, useState } from "react";
import { ImageIcon, Move } from "lucide-react";
import { compressImage } from "@/lib/image-compress";

const clamp = (n: number) => Math.max(0, Math.min(100, n));
function parsePos(p: string): { x: number; y: number } {
  const [x, y] = p.split(" ").map((v) => parseFloat(v));
  return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y };
}

export function ImageUpload({
  name = "imageUrl",
  defaultUrl,
  label = "Imagen",
  aspect = "square",
  // Modo reposicionar: permite arrastrar la foto para elegir qué parte se ve.
  reposition = false,
  positionName = "imagePosition",
  defaultPosition = "50% 50%",
}: {
  name?: string;
  defaultUrl?: string | null;
  label?: string;
  aspect?: "square" | "wide";
  reposition?: boolean;
  positionName?: string;
  defaultPosition?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [position, setPosition] = useState(defaultPosition || "50% 50%");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Arrastre para reposicionar el punto focal (object-position).
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ cx: number; cy: number; px: number; py: number } | null>(
    null,
  );

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const optimized = await compressImage(file);
      const fd = new FormData();
      fd.append("file", optimized);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Error al subir (${res.status}).`);
      }
      setUrl(data.url);
      setPosition("50% 50%"); // nueva foto: centrada por defecto
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.cx) / rect.width) * 100;
    const dy = ((e.clientY - drag.current.cy) / rect.height) * 100;
    // Arrastrar la foto revela el lado contrario -> se resta el desplazamiento.
    const nx = clamp(drag.current.px - dx);
    const ny = clamp(drag.current.py - dy);
    setPosition(`${Math.round(nx)}% ${Math.round(ny)}%`);
  }

  const showReposition = reposition && url;

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* Guarda la URL final y (si aplica) la posición para el formulario */}
      <input type="hidden" name={name} value={url} />
      {reposition && (
        <input type="hidden" name={positionName} value={position} />
      )}

      <div className="flex items-start gap-4">
        {showReposition ? (
          <div
            ref={boxRef}
            onPointerDown={(e) => {
              const { x, y } = parsePos(position);
              drag.current = { cx: e.clientX, cy: e.clientY, px: x, py: y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            className="relative h-40 w-40 shrink-0 cursor-move touch-none select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            title="Arrastra la foto para encajarla"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              draggable={false}
              style={{ objectPosition: position }}
              className="pointer-events-none h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white">
              <Move className="h-3 w-3" /> Arrastra para encajar
            </span>
          </div>
        ) : (
          <div
            className={`overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${
              aspect === "square" ? "h-24 w-24" : "h-16 w-28"
            }`}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <ImageIcon className="h-7 w-7" />
              </div>
            )}
          </div>
        )}

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
          <p className="text-xs text-gray-400">
            JPG, PNG, WEBP o GIF · se optimizan solas al subir
          </p>
          {showReposition && (
            <p className="text-xs text-gray-400">
              Arrastra la foto en el recuadro para elegir qué parte se ve en la
              tienda.
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
