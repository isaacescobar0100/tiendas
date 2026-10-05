import { isSafeImageUrl, safePosition } from "@/lib/utils";

// Fotos del negocio (el local, el equipo, los dueños). Se guardan en
// Store.photosJson y se muestran en el login, el menú QR y la tienda.

export type StorePhoto = { url: string; position: string; zoom: number };

export const MAX_STORE_PHOTOS = 8;

/** Sanea una foto ({url, position, zoom}); null si la URL no es una imagen segura. */
function toPhoto(r: unknown): StorePhoto | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url.trim() : "";
  if (!url || url.length > 500 || !isSafeImageUrl(url)) return null;
  const zoom = Number(o.zoom);
  return {
    url,
    position: safePosition(o.position),
    zoom: Number.isFinite(zoom) ? Math.min(3, Math.max(1, zoom)) : 1,
  };
}

/** Lee y sanea las fotos: solo URLs de imagen seguras, encuadre válido, máx. 8. */
export function parseStorePhotos(json: string | null | undefined): StorePhoto[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: StorePhoto[] = [];
  for (const r of raw) {
    const photo = toPhoto(r);
    if (!photo) continue;
    out.push(photo);
    if (out.length >= MAX_STORE_PHOTOS) break;
  }
  return out;
}

/** Una sola foto guardada como JSON ({url, position, zoom}); null si no hay o no es válida. */
export function parseStorePhoto(json: string | null | undefined): StorePhoto | null {
  if (!json) return null;
  try {
    return toPhoto(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Foto desde los campos de un formulario de ImageUpload (url / posición / zoom). */
export function photoFromForm(
  formData: FormData,
  prefix: string,
): StorePhoto | null {
  const url = String(formData.get(`${prefix}Url`) ?? "").trim();
  if (!url) return null;
  return toPhoto({
    url,
    position: formData.get(`${prefix}Position`),
    zoom: formData.get(`${prefix}Zoom`),
  });
}
