import { prisma } from "@/lib/prisma";
import { sendRentEmail } from "@/lib/email";

// Cron diario (Vercel): avisa por correo a las tiendas de renta cuyo plan
// vence pronto (≤3 días) o ya venció. No repite el mismo aviso (rentNotice).
export async function GET(request: Request) {
  // Si hay CRON_SECRET, exige el header que Vercel añade a los crons.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
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

    const ok = await sendRentEmail({
      to: store.owner.email,
      storeName: store.name,
      kind,
      paidUntil: store.paidUntil,
    });
    if (ok) {
      await prisma.store.update({
        where: { id: store.id },
        data: { rentNotice: key },
      });
      sent += 1;
    }
  }

  return Response.json({ checked: stores.length, sent });
}
