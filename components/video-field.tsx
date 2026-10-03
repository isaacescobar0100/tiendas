"use client";

import { useRef, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { Film, Link2, Trash2, Upload } from "lucide-react";
import { parseCoverVideo } from "@/lib/video";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB (el servidor exige lo mismo)
const TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

// Video de portada: subirlo desde el teléfono/computador (directo a Vercel
// Blob, con progreso) o pegar un enlace (YouTube, Vimeo o un .mp4).
// Escribe la URL final en un campo oculto `name`.
export function VideoField({ name, defaultUrl }: { name: string; defaultUrl: string | null }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [mode, setMode] = useState<"upload" | "link">(
    defaultUrl && parseCoverVideo(defaultUrl)?.kind !== "file" ? "link" : "upload",
  );
  const [link, setLink] = useState(defaultUrl ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const video = parseCoverVideo(url);

  async function onFile(file: File) {
    setError("");
    const ext = TYPES[file.type];
    if (!ext) return setError("Formato no válido: usa MP4, WEBM o MOV.");
    if (file.size > MAX_BYTES) return setError("El video supera los 100 MB. Recórtalo o comprímelo.");
    setProgress(0);
    try {
      const id = crypto.randomUUID();
      const blob = await uploadPresigned(`videos/${id}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/video",
        contentType: file.type,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setUrl(blob.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el video.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const tab = (m: "upload" | "link", label: string, Icon: typeof Upload) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === m ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div role="tablist" className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        {tab("upload", "Subir video", Upload)}
        {tab("link", "Pegar enlace", Link2)}
      </div>

      {mode === "upload" ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-2 px-4 py-6 text-sm text-ink-3 transition hover:border-brand hover:text-ink disabled:cursor-wait"
          >
            <Film className="h-6 w-6" />
            {progress !== null ? (
              <span className="w-full max-w-xs">
                <span className="block text-center font-medium text-ink">Subiendo… {progress}%</span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
                </span>
              </span>
            ) : (
              <span>
                <span className="font-semibold text-ink">Elige un video</span> de tu teléfono o
                computador (MP4, WEBM o MOV, máx. 100 MB)
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="mt-3">
          <input
            value={link}
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…  o  https://…/video.mp4"
            onChange={(e) => {
              const v = e.target.value.trim();
              setLink(v);
              setError(v && !parseCoverVideo(v) ? "Enlace no válido: usa YouTube, Vimeo o un video .mp4 con https." : "");
              setUrl(v && parseCoverVideo(v) ? v : v ? url : "");
            }}
            className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <p className="mt-1 text-xs text-ink-3">YouTube y Vimeo se ven en bucle y sin sonido.</p>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-bad-ink">{error}</p>}

      {video && (
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-line">
          <div className="relative aspect-video bg-black">
            {video.kind === "file" ? (
              <video src={video.src} muted autoPlay loop playsInline className="h-full w-full object-cover" />
            ) : (
              <iframe src={video.src} title="Vista previa del video" allow="autoplay; encrypted-media" className="pointer-events-none h-full w-full border-0" />
            )}
          </div>
          <div className="flex items-center justify-between gap-3 bg-surface-2 px-3 py-2 text-xs text-ink-3">
            <span className="truncate">
              {video.kind === "file" ? "Video subido" : video.kind === "youtube" ? "YouTube" : "Vimeo"}
            </span>
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setLink("");
              }}
              className="inline-flex shrink-0 items-center gap-1 font-medium text-bad-ink hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Quitar video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
