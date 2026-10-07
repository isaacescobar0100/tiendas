import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

// Prueba de Sentry: solo el superadmin. Envía un error de prueba, espera a que
// salga y responde si el servidor tiene Sentry activo. Con ?lanzar=1 lanza un
// error real sin capturar.
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (user?.role !== "SUPERADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // ?lanzar=1 → error sin capturar, como uno real (lo reporta onRequestError).
  if (new URL(request.url).searchParams.get("lanzar")) {
    throw new Error(`Prueba de Sentry (error real del servidor) ${new Date().toISOString()}`);
  }
  const client = Sentry.getClient();
  const id = Sentry.captureException(new Error(`Prueba de Sentry (servidor) ${new Date().toISOString()}`));
  const flushed = await Sentry.flush(5000);
  return NextResponse.json({
    activo: !!client && client.getOptions().enabled !== false,
    hayCliente: !!client,
    vercel: process.env.VERCEL ?? null,
    eventId: id,
    enviado: flushed,
  });
}
