import { Store, Clock } from "lucide-react";

// Página que se muestra cuando una tienda está desactivada (mantenimiento).
// Usa los colores del tema de la tienda (el layout la envuelve con el tema).
export function StoreUnavailable({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">
      {/* Manchas de color de marca en el fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand opacity-20 blur-3xl"
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
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-lg"
          >
            <Store className="h-9 w-9" />
          </div>
        )}

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-md">
          <Clock className="h-8 w-8 animate-pulse text-brand-text" />
        </div>

        <h1 className="text-3xl font-bold text-ink">Volvemos enseguida</h1>
        <p className="mt-3 leading-relaxed text-ink-3">
          <strong className="text-ink-2">{name}</strong> está en
          mantenimiento por unos minutos. Gracias por tu paciencia — vuelve
          pronto.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm text-ink-3 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75"
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand"
            />
          </span>
          Volviendo en unos minutos
        </div>
      </div>

      <p className="relative z-10 mt-16 text-xs text-ink-3">
        {name} · con tecnología de MiTienda
      </p>
    </main>
  );
}
