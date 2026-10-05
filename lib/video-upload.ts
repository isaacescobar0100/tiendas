import { uploadPresigned } from "@vercel/blob/client";

// Subida de videos desde el navegador, directo a Vercel Blob (con progreso).
// La usan el video de portada y la galería de Conócenos.

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB (el servidor exige lo mismo)
const TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Motivo por el que el archivo no se puede subir, o null si sirve. */
export function videoFileError(file: File): string | null {
  if (!TYPES[file.type]) return "Formato no válido: usa MP4, WEBM o MOV.";
  if (file.size > MAX_BYTES) return "El video supera los 100 MB. Recórtalo o comprímelo.";
  return null;
}

/** Sube el video (ya validado con videoFileError) y devuelve su URL pública. */
export async function uploadVideo(file: File, onProgress: (pct: number) => void): Promise<string> {
  // El servidor da el nombre (en la carpeta de la tienda).
  const res = await fetch(`/api/upload/video?ext=${TYPES[file.type]}`, { cache: "no-store" });
  const { pathname, error } = (await res.json().catch(() => ({}))) as { pathname?: string; error?: string };
  if (!res.ok || !pathname) throw new Error(error ?? "No se pudo preparar la subida.");
  const blob = await uploadPresigned(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload/video",
    contentType: file.type,
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: (p) => onProgress(Math.round(p.percentage)),
  });
  return blob.url;
}
