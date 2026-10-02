import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  try {
    // Solo un admin con tienda o un superadmin, comprobado contra la BD
    // (una cuenta borrada o con la clave cambiada ya no puede subir).
    const user = await getSessionUser();
    const allowed =
      user?.role === "SUPERADMIN" ||
      (user?.role === "ADMIN" &&
        !!(await prisma.store.findUnique({
          where: { ownerId: user.id },
          select: { id: true },
        })));
    if (!allowed) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const rl = await rateLimit(`upload:${clientIpFromRequest(request)}`, 40, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Demasiadas subidas. Espera un momento." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se envió archivo." },
        { status: 400 },
      );
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido (usa JPG, PNG, WEBP o GIF)." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera los 5 MB." },
        { status: 400 },
      );
    }

    const filename = `${randomUUID()}.${EXT[file.type]}`;

    // Usa Vercel Blob si hay un store conectado (por token clásico o por OIDC/BLOB_STORE_ID)
    const useBlob =
      !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID;
    if (useBlob) {
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    // Sin Blob configurado: en un entorno serverless (Vercel) no se puede escribir en disco
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Falta configurar el almacenamiento de imágenes (Vercel Blob). Conéctalo en Storage y vuelve a desplegar.",
        },
        { status: 500 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e) {
    console.error("[upload] error:", e);
    return NextResponse.json(
      { error: "No se pudo subir la imagen. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
