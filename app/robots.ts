import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zonas privadas: no deben indexarse.
      disallow: ["/admin", "/superadmin", "/api", "/login"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
