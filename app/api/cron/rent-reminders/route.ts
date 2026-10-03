import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendRentEmail } from "@/lib/email";
import { billingOf } from "@/lib/billing";

// Comparación en tiempo constante del header de autorización.
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Cron diario (Vercel): avisa por correo al admin de cada tienda cuyo plan
// vence pronto (anual: 30 y 7 días antes; mensual: 3), ya venció (en gracia) o
// quedó suspendida. Cada aviso sale una sola vez por fecha (rentNotice).
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
    where: { paidUntil: { not: null } },
    select: {
      id: true,
      plan: true,
      name: true,
      paidUntil: true,
      rentNotice: true,
      owner: { select: { email: true } },
    },
  });

  let sent = 0;
  for (const store of stores) {
    if (!store.paidUntil) continue;
    const { status, stage, days } = billingOf(store, now);
    if (!stage || days === null) continue;
    const kind =
      status === "suspended" ? "suspended" : status === "grace" ? "overdue" : "soon";

    const key = `${stage}:${store.paidUntil.toISOString().slice(0, 10)}`;
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
      days,
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
