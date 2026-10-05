import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getAdminStoreId } from "@/lib/guards";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

// Subida DIRECTA de videos (navegador → Vercel Blob). Un video no cabe por el
// servidor (límite ~4,5 MB por petición en Vercel), así que aquí solo se
// firma un permiso corto: un archivo, solo video, tamaño máximo y 10 minutos.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// Ruta fija y en la carpeta de la tienda: videos/<storeId>/<uuid>.<ext>. El
// nombre lo pone el servidor (GET) y al firmar se exige que sea de la tienda
// de quien sube: un admin no puede escribir en los videos de otra tienda.
const PATHNAME = /^videos\/([a-z0-9]{8,40})\/[0-9a-f-]{36}\.(mp4|webm|mov)$/;
const EXTS = ["mp4", "webm", "mov"];

/** Nombre del archivo para un video nuevo de la tienda del admin. */
export async function GET(request: Request) {
  // Admin con tienda, o superadmin dentro de una tienda (comprobado en la BD).
  const storeId = await getAdminStoreId();
  if (!storeId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const ext = new URL(request.url).searchParams.get("ext") ?? "";
  if (!EXTS.includes(ext)) return NextResponse.json({ error: "Formato no válido." }, { status: 400 });
  return NextResponse.json({ pathname: `videos/${storeId}/${randomUUID()}.${ext}` }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  // Admin con tienda, o superadmin dentro de una tienda (comprobado en la BD).
  const storeId = await getAdminStoreId();
  if (!storeId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const rl = await rateLimit(`upload-video:${clientIpFromRequest(request)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiadas subidas. Espera un momento." }, { status: 429 });
  }
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "El almacenamiento de archivos no está configurado." },
      { status: 500 },
    );
  }

  let body: HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (PATHNAME.exec(pathname)?.[1] !== storeId) throw new Error("Nombre de archivo no permitido.");
        const limits = {
          allowedContentTypes: VIDEO_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
        };
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          validUntil: Date.now() + 10 * 60 * 1000,
          ...limits,
        });
        // Nunca reemplazar un archivo existente (va firmado en la URL).
        return { token, urlOptions: { ...limits, allowOverwrite: false } };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[upload-video]", e);
    // Mensaje fijo: el detalle (de Vercel Blob) queda solo en el registro.
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 400 });
  }
}
