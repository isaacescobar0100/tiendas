import { requireAdminStore } from "@/lib/guards";
import { storeTheme } from "@/lib/theme";
import { themeFontVars } from "@/lib/fonts";
import { ThemeEditor } from "./theme-editor";

export const dynamic = "force-dynamic";

// Apariencia de la tienda: colores, modo y tipografía, con vista previa en
// vivo y protecciones de contraste. Aplica a la tienda pública, el menú QR y
// el carrito; el panel de admin conserva el tema de la plataforma.
export default async function AppearancePage() {
  const { store } = await requireAdminStore();
  return (
    <div className={themeFontVars}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apariencia</h1>
        <p className="mt-1 text-sm text-gray-500">
          Los colores y la letra de tu tienda, tu menú QR y tu carrito. Elige
          una paleta y ajústala; la vista previa muestra cómo queda.
        </p>
      </div>
      <ThemeEditor
        initial={storeTheme(store)}
        storeName={store.name}
        logoUrl={store.logoUrl}
      />
    </div>
  );
}
