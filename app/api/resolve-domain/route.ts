import { prisma } from "@/lib/prisma";

// Devuelve el slug de la tienda que tiene ese dominio propio (o null).
// La usa el middleware para mapear dominio → tienda.
export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get("host") ?? "";
  if (!host) return Response.json({ slug: null });
  const store = await prisma.store.findFirst({
    where: { customDomain: host, active: true },
    select: { slug: true },
  });
  return Response.json({ slug: store?.slug ?? null });
}
