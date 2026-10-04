import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { storeForHost } from "@/lib/host-store";
import { storeUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Zonas privadas o sin valor para buscadores. Ojo: "/sede/" (panel de sedes)
// con barra final, para no bloquear "/sedes" (páginas públicas de cada sede).
const PRIVATE = [
  "/admin",
  "/superadmin",
  "/api/",
  "/login",
  "/recuperar",
  "/restablecer",
  "/sede/",
  "/sede$",
  "/checkout",
  "/cart",
  "/cuenta",
  "/favorites",
  "/rastrear",
];

// Buscadores con IA: se permiten explícitamente (GEO) para que puedan leer
// la tienda, su menú y sus sedes al responder preguntas.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = await storeForHost();
  // La plataforma (panel, dominio principal) no se indexa.
  if (!store) return { rules: { userAgent: "*", disallow: "/" } };

  const host = (await headers()).get("host") ?? "";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${storeUrl(store)}/sitemap.xml`,
    host: host || undefined,
  };
}
