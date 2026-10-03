import { SettingsNav } from "./settings-nav";

// Ajustes por secciones: submenú a la izquierda (arriba en el celular) y la
// sección elegida a la derecha. Cada sección guarda solo lo suyo.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Ajustes</h1>
        <p className="text-sm text-ink-3">Configura tu tienda y tu cuenta.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
