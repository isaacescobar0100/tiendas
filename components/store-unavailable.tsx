import { Store, Clock } from "lucide-react";

// Página que se muestra cuando una tienda está desactivada (mantenimiento).
export function StoreUnavailable({
  name,
  logoUrl,
  themeColor,
}: {
  name: string;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const brand = themeColor || "#111827";
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-50 px-6 text-center">
      {/* Manchas de color de marca en el fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: brand }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: brand }}
      />

      <div className="relative z-10 max-w-md">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: brand }}
          >
            <Store className="h-9 w-9" />
          </div>
        )}

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
          <Clock className="h-8 w-8 animate-pulse" style={{ color: brand }} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Volvemos enseguida</h1>
        <p className="mt-3 leading-relaxed text-gray-500">
          <strong className="text-gray-700">{name}</strong> está en
          mantenimiento por unos minutos. Gracias por tu paciencia — vuelve
          pronto. 💛
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: brand }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: brand }}
            />
          </span>
          Volviendo en unos minutos
        </div>
      </div>

      <p className="relative z-10 mt-16 text-xs text-gray-400">
        {name} · con tecnología de MiTienda
      </p>
    </main>
  );
}
