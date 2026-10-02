import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendRentEmail } from "@/lib/email";

// Comparación en tiempo constante del header de autorización.
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Cron diario (Vercel): avisa por correo a las tiendas de renta cuyo plan
// vence pronto (≤3 días) o ya venció. No repite el mismo aviso (rentNotice).
export async function GET(request: Request) {
  // Exige el header que Vercel añade a los crons (Authorization: Bearer
  // CRON_SECRET). Sin CRON_SECRET configurado, el endpoint queda cerrado.
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(given, `Bearer ${secret}`)) {
    return new Response("No autorizado", { status: 401 });
  }

  const now = Date.now();
  const stores = await prisma.store.findMany({
    where: { plan: "RENT", paidUntil: { not: null } },
    select: {
      id: true,
      name: true,
      paidUntil: true,
      rentNotice: true,
      owner: { select: { email: true } },
    },
  });

  let sent = 0;
  for (const store of stores) {
    if (!store.paidUntil) continue;
    const days = Math.ceil((store.paidUntil.getTime() - now) / 86400000);
    const kind = days < 0 ? "overdue" : days <= 3 ? "soon" : null;
    if (!kind) continue;

    const key = `${kind}:${store.paidUntil.toISOString().slice(0, 10)}`;
    if (store.rentNotice === key) continue; // ya avisado

    // Reserva el aviso antes de enviarlo (atómico): dos ejecuciones a la vez
    // no pueden mandar el mismo correo dos veces.
    const claim = await prisma.store.updateMany({
      where: { id: store.id, rentNotice: store.rentNotice },
      data: { rentNotice: key },
    });
    if (claim.count === 0) continue;

    const ok = await sendRentEmail({
      to: store.owner.email,
      storeName: store.name,
      kind,
      paidUntil: store.paidUntil,
    });
    if (ok) {
      sent += 1;
    } else {
      // No se pudo enviar: libera la reserva para reintentarlo mañana.
      await prisma.store.updateMany({
        where: { id: store.id, rentNotice: key },
        data: { rentNotice: store.rentNotice },
      });
    }
  }

  return Response.json({ sent });
}
