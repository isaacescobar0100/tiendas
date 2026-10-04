import { Sparkles } from "lucide-react";
import { requireAdminStore } from "@/lib/guards";
import { parseAbout } from "@/lib/about";
import { storePublicUrl } from "@/lib/site-url";
import { AboutForm } from "./about-form";

export const dynamic = "force-dynamic";

// Página "Conócenos" de la tienda: quiénes somos, misión, visión, valores,
// contacto, redes y preguntas frecuentes.
export default async function AboutAdminPage() {
  const { store } = await requireAdminStore();
  const about = parseAbout(store.aboutJson);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Sparkles className="h-6 w-6" /> Página Conócenos
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Tu página de bienvenida: quiénes son, misión, visión, cómo contactarlos (incluido el
          correo para publicidad) y preguntas frecuentes. Se abre desde el botón de la portada.
        </p>
      </div>
      <AboutForm initial={about} publicUrl={`${storePublicUrl(store)}/nosotros`} />
    </div>
  );
}
