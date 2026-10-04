import { prisma } from "@/lib/prisma";

// Para el middleware:
//  - ?host=dominio → slug de la tienda que tiene ese dominio propio (o null).
//  - ?slug=tienda  → su dominio propio si ya está ACTIVO (para redirigir el
//    subdominio hacia él), o null.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug");
  if (slug) {
    const store = await prisma.store.findFirst({
      where: { slug, active: true, domainActive: true, customDomain: { not: null } },
      select: { customDomain: true },
    });
    return Response.json({ domain: store?.customDomain ?? null });
  }
  const host = params.get("host") ?? "";
  if (!host) return Response.json({ slug: null });
  const store = await prisma.store.findFirst({
    where: { customDomain: host, active: true },
    select: { slug: true },
  });
  return Response.json({ slug: store?.slug ?? null });
}
