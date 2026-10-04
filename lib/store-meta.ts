import type { Metadata } from "next";

/** Íconos de la pestaña: el logo de la tienda o, si no tiene, el de la plataforma. */
export function storeIcons(logoUrl: string | null | undefined): Metadata["icons"] {
  if (logoUrl && /^https:\/\//i.test(logoUrl)) {
    return { icon: logoUrl, shortcut: logoUrl, apple: logoUrl };
  }
  return { icon: "/favicon.ico" };
}
