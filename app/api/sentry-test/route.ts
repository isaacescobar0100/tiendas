import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

// Prueba de Sentry: solo el superadmin. Envía un error de prueba, espera a que
// salga y responde si el servidor tiene Sentry activo.
export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== "SUPERADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
