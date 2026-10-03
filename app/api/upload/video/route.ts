import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

// Subida DIRECTA de videos (navegador → Vercel Blob). Un video no cabe por el
// servidor (límite ~4,5 MB por petición en Vercel), así que aquí solo se
// firma un permiso corto: un archivo, solo video, tamaño máximo y 10 minutos.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// Ruta fija y sin sorpresas: videos/<id>.<ext>
const PATHNAME = /^videos\/[a-z0-9-]{8,64}\.(mp4|webm|mov)$/;

export async function POST(request: Request) {
  // Solo un admin con tienda o un superadmin (comprobado contra la BD).
  const user = await getSessionUser();
  const allowed =
    user?.role === "SUPERADMIN" ||
    (user?.role === "ADMIN" &&
      !!(await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } })));
  if (!allowed) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

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
        if (!PATHNAME.test(pathname)) throw new Error("Nombre de archivo no permitido.");
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
        return { token, urlOptions: limits };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[upload-video]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo preparar la subida." },
      { status: 400 },
    );
  }
}
