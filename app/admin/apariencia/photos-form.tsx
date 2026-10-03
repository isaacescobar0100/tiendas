"use client";

import { useActionState } from "react";
import { Check, ImageIcon } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { MultiImageUpload, type GalleryItem } from "@/components/multi-image-upload";
import { keepFormSubmit } from "@/components/keep-form";
import type { StorePhoto } from "@/lib/store-photos";
import { savePhotosAction, type PhotosState } from "./photos-actions";

// Fotos de la tienda: fondos (portada del menú QR y pantalla de acceso) y la
// galería del negocio. Los fondos llevan una capa oscura para que el texto
// siempre se lea, sea cual sea la foto.
export function PhotosForm({
  menuBg,
  loginBg,
  gallery,
}: {
  menuBg: StorePhoto | null;
  loginBg: StorePhoto | null;
  gallery: GalleryItem[];
}) {
  const [state, formAction, pending] = useActionState<PhotosState, FormData>(
    savePhotosAction,
    undefined,
  );
  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ImageIcon className="h-4 w-4" /> Fotos de fondo
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tu local, tu equipo o tus platos como fondo. Arrastra la foto para elegir
          qué parte se ve. Encima va una capa oscura para que el texto se lea.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-800">Portada del menú QR</p>
          <ImageUpload
            name="menuBgUrl"
            label="Fondo detrás del logo del menú"
            aspect="wide"
            reposition
            positionName="menuBgPosition"
            zoomName="menuBgZoom"
            defaultUrl={menuBg?.url ?? null}
            defaultPosition={menuBg?.position}
            defaultZoom={menuBg?.zoom}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-800">Pantalla de acceso (login)</p>
          <ImageUpload
            name="loginBgUrl"
            label="Fondo del login del panel y de las sedes"
            aspect="wide"
            reposition
            positionName="loginBgPosition"
            zoomName="loginBgZoom"
            defaultUrl={loginBg?.url ?? null}
            defaultPosition={loginBg?.position}
            defaultZoom={loginBg?.zoom}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="text-sm font-medium text-gray-800">Galería del negocio</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Hasta 8 fotos: salen en la sección &ldquo;Nuestro lugar&rdquo; del inicio de tu tienda.
        </p>
        <div className="mt-3">
          <MultiImageUpload name="photos" defaultItems={gallery} label="Fotos" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> {pending ? "Guardando…" : "Guardar fotos"}
        </button>
        {state?.ok && (
          <span role="status" className="text-sm text-green-700">
            Fotos guardadas.
          </span>
        )}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
