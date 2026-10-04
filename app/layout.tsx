import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getBaseUrl } from "@/lib/site-url";
import { storeForHost } from "@/lib/host-store";
import { storeIcons } from "@/lib/store-meta";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cada tienda es independiente: desde su dirección (subdominio o dominio
// propio) la pestaña lleva SU logo y SU nombre en todas las pantallas
// (tienda, login, recuperar clave…). Desde la plataforma, la marca MiTienda.
export async function generateMetadata(): Promise<Metadata> {
  const store = await storeForHost();
  return {
    // Base para resolver URLs relativas de imágenes/canonical en toda la app.
    metadataBase: new URL(getBaseUrl()),
    title: store
      ? { default: store.name, template: `%s · ${store.name}` }
      : { default: "MiTienda — Plataforma de tiendas online", template: "%s · MiTienda" },
    description: store?.description || "Crea y gestiona tu tienda online.",
    icons: storeIcons(store?.logoUrl),
    openGraph: {
      type: "website",
      siteName: store?.name ?? "MiTienda",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
