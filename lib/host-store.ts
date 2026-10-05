// Tienda dueña del host actual (subdominio o dominio propio). Sirve para que
// las pantallas de la plataforma que se abren desde la dirección de una
// tienda (login de admin, de sede, recuperar clave) lleven su marca y su
// tema. Solo cosmético: no da permisos ni cambia a qué cuenta se entra.
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { cleanHost, isMainHost, isPlatformHost, isRootHost, subdomainSlug } from "@/lib/store-host";

const SELECT = {
  id: true,
  type: true,
  customDomain: true, domainActive: true,
  updatedAt: true,
  hoursJson: true,
  seoTitle: true,
  seoDescription: true,
  seoCity: true,
  seoKeywords: true,
  aboutJson: true,
  currency: true,
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
  loginBgJson: true,
} as const;

// cache(): la consultan el layout raíz, el login y sus acciones en la misma petición.
export const storeForHost = cache(async () => {
  const host = cleanHost((await headers()).get("host") ?? "");
  if (!host || isPlatformHost(host)) return null;
  const slug = subdomainSlug(host);
  if (slug) {
    return prisma.store.findFirst({ where: { slug, active: true }, select: SELECT });
  }
  // Dominio principal de la plataforma (o del puente): sin tienda.
  if (isRootHost(host) || isMainHost(host)) return null;
  return prisma.store.findFirst({
    where: { customDomain: host, active: true },
    select: SELECT,
  });
});
