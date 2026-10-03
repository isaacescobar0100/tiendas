import { isSafeImageUrl, safePosition } from "@/lib/utils";

// Fotos del negocio (el local, el equipo, los dueños). Se guardan en
// Store.photosJson y se muestran en el login, el menú QR y la tienda.

export type StorePhoto = { url: string; position: string; zoom: number };

export const MAX_STORE_PHOTOS = 8;

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
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!url || url.length > 500 || !isSafeImageUrl(url)) continue;
    const zoom = Number(o.zoom);
    out.push({
      url,
      position: safePosition(o.position),
      zoom: Number.isFinite(zoom) ? Math.min(3, Math.max(1, zoom)) : 1,
    });
    if (out.length >= MAX_STORE_PHOTOS) break;
  }
  return out;
}

/** Una sola foto guardada como JSON ({url, position, zoom}); null si no hay o no es válida. */
export function parseStorePhoto(json: string | null | undefined): StorePhoto | null {
  if (!json) return null;
  try {
    return parseStorePhotos(JSON.stringify([JSON.parse(json)]))[0] ?? null;
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
  return parseStorePhoto(
    JSON.stringify({
      url,
      position: formData.get(`${prefix}Position`),
      zoom: formData.get(`${prefix}Zoom`),
    }),
  );
}
