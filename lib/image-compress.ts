// Optimización de imágenes en el navegador (antes de subirlas).
// Redimensiona a un máximo y recomprime para que pesen poco sin perder
// calidad visible. Se ejecuta en el cliente; no requiere dependencias.

// Calidad máxima que conservamos: lado más largo 1600px y compresión 82%.
// Suficiente para verse nítida en pantalla y móvil, ocupando ~5x menos.
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

/**
 * Devuelve una versión optimizada (WebP, o JPEG si el navegador no soporta
 * exportar WebP) del archivo. Si algo falla o no mejora, devuelve el original.
 * Los GIF se dejan intactos (comprimirlos perdería la animación).
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    // `from-image` respeta la orientación EXIF (fotos de móvil giradas).
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), type, QUALITY),
      );

    // WebP comprime mejor; si el navegador no lo exporta, cae a JPEG.
    let out = await toBlob("image/webp");
    if (!out || out.type !== "image/webp") out = await toBlob("image/jpeg");
    if (!out) return file;

    // Si no logramos reducir el tamaño, conservamos el original.
    if (out.size >= file.size) return file;

    const ext = out.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([out], `${base}.${ext}`, { type: out.type });
  } catch {
    return file; // ante cualquier error, sube el original
  }
}
