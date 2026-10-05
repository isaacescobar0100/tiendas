"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Film, ImagePlus, Link2, Play, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { parseCoverVideo, videoThumb } from "@/lib/video";
import { ABOUT_LIMITS, type AboutMedia } from "@/lib/about";
import { uploadVideo as uploadVideoFile, videoFileError } from "@/lib/video-upload";

/**
 * Galería de la página Conócenos: subir varias fotos a la vez, subir videos
 * (directo a Vercel Blob, con progreso) o pegar un enlace de YouTube/Vimeo.
 * Cada elemento tiene leyenda, se puede mover y quitar.
 */
export function GalleryEditor({
  items,
  update,
}: {
  items: AboutMedia[];
  // Actualización funcional: las subidas terminan en momentos distintos.
  update: (fn: (prev: AboutMedia[]) => AboutMedia[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const room = ABOUT_LIMITS.gallery - items.length;

  const push = (m: AboutMedia) => update((prev) => [...prev, m].slice(0, ABOUT_LIMITS.gallery));

  async function uploadPhotos(files: File[]) {
    setError("");
    const list = files.slice(0, room);
    for (let i = 0; i < list.length; i++) {
      setBusy(`Subiendo foto ${i + 1} de ${list.length}…`);
      try {
        const fd = new FormData();
        fd.append("file", await compressImage(list[i]));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? `Error al subir (${res.status}).`);
        push({ kind: "image", url: data.url, caption: "" });
      } catch (e) {
        setError(`${list[i].name}: ${e instanceof Error ? e.message : "no se pudo subir."}`);
      }
    }
    if (files.length > list.length) setError(`Máximo ${ABOUT_LIMITS.gallery} elementos en la galería.`);
    setBusy(null);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function uploadVideo(file: File) {
    const invalid = videoFileError(file);
    setError(invalid ?? "");
    if (invalid) return;
    setBusy("Subiendo video… 0%");
    try {
      const url = await uploadVideoFile(file, (pct) => setBusy(`Subiendo video… ${pct}%`));
      push({ kind: "video", url, caption: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el video.");
    } finally {
      setBusy(null);
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  function addLink() {
    const v = link.trim();
    if (!parseCoverVideo(v)) return setError("Enlace no válido: usa YouTube, Vimeo o un video .mp4 con https.");
    setError("");
    push({ kind: "video", url: v, caption: "" });
    setLink("");
  }

  const move = (i: number, d: -1 | 1) => {
    update((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm font-medium text-ink-2 transition hover:border-brand hover:text-ink disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!!busy || room <= 0} onClick={() => photoRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> Subir fotos
        </button>
        <button type="button" className={btn} disabled={!!busy || room <= 0} onClick={() => videoRef.current?.click()}>
          <Film className="h-4 w-4" /> Subir video
        </button>
        <input
          ref={photoRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          aria-label="Fotos para la galería"
          onChange={(e) => e.target.files?.length && uploadPhotos(Array.from(e.target.files))}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          aria-label="Video para la galería"
          onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
        />
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="gallery-link">
          Enlace de video
        </label>
        <input
          id="gallery-link"
          value={link}
          inputMode="url"
          placeholder="Pega un enlace de YouTube, Vimeo o .mp4"
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        />
        <button type="button" className={btn} disabled={!link.trim() || room <= 0} onClick={addLink}>
          <Link2 className="h-4 w-4" /> Añadir
        </button>
      </div>

      {busy && (
        <p role="status" className="rounded-lg bg-info-soft px-3 py-2 text-sm text-info-ink">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">
          Aún no hay fotos ni videos. Sube varios: el local, la comida, el equipo, eventos…
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m, i) => (
            <li key={`${m.url}-${i}`} className="overflow-hidden rounded-xl border border-line bg-surface-2">
              <Thumb media={m} />
              <div className="space-y-2 p-2">
                <input
                  value={m.caption}
                  maxLength={ABOUT_LIMITS.caption}
                  placeholder="Leyenda (opcional)"
                  aria-label={`Leyenda del elemento ${i + 1}`}
                  onChange={(e) => {
                    const caption = e.target.value;
                    update((prev) => prev.map((x, j) => (j === i ? { ...x, caption } : x)));
                  }}
                  className="w-full rounded-md border border-line-2 bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-ink"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <IconBtn label="Mover antes" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Mover después" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                  <IconBtn label={`Quitar elemento ${i + 1}`} danger onClick={() => update((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-3">
        {items.length}/{ABOUT_LIMITS.gallery} · Fotos JPG, PNG o WEBP (se optimizan solas) · Videos MP4, WEBM o MOV
        hasta 100 MB. Las fotos del negocio de Apariencia también se suman a la galería.
      </p>
    </div>
  );
}

function Thumb({ media }: { media: AboutMedia }) {
  if (media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt="" className="aspect-[4/3] w-full object-cover" />;
  }
  const v = parseCoverVideo(media.url);
  const thumb = v ? videoThumb(v) : null;
  return (
    <div className="relative aspect-[4/3] bg-black">
      {v?.kind === "file" ? (
        <video src={`${v.src}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-full w-full object-cover" />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="h-4 w-4" />
        </span>
      </span>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface transition disabled:opacity-40 ${
        danger ? "text-bad-ink hover:bg-bad-soft" : "text-ink-2 hover:bg-surface-3"
      }`}
    >
      {children}
    </button>
  );
}
