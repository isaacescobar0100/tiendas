import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

// Prueba de Sentry: solo el superadmin. Lanza un error a propósito para
// confirmar que llega al panel de Sentry.
export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== "SUPERADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  throw new Error(`Prueba de Sentry (superadmin) ${new Date().toISOString()}`);
}
