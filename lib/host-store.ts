// Tienda dueña del host actual (subdominio o dominio propio). Sirve para que
// las pantallas de la plataforma que se abren desde la dirección de una
// tienda (login de admin, de sede, recuperar clave) lleven su marca y su
// tema. Solo cosmético: no da permisos ni cambia a qué cuenta se entra.
import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cleanHost, isRootHost, subdomainSlug } from "@/lib/store-host";

const SELECT = {
  name: true,
  slug: true,
  logoUrl: true,
  description: true,
  themeColor: true,
  themeBg: true,
  themeSurface: true,
  themeInk: true,
  themeMode: true,
  themeFont: true,
} as const;

export async function storeForHost() {
  const host = cleanHost((await headers()).get("host") ?? "");
  if (!host) return null;
  const slug = subdomainSlug(host);
  if (slug) {
    return prisma.store.findFirst({ where: { slug, active: true }, select: SELECT });
  }
  // Dominio principal de la plataforma (o del puente): sin tienda.
  if (
    isRootHost(host) ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1")
  ) {
    return null;
  }
  return prisma.store.findFirst({
    where: { customDomain: host, active: true },
    select: SELECT,
  });
}

export type HostStore = NonNullable<Awaited<ReturnType<typeof storeForHost>>>;
