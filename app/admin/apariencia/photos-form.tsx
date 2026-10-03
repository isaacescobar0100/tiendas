"use client";

import { useActionState } from "react";
import { Check, ImageIcon } from "lucide-react";
import { MultiImageUpload, type GalleryItem } from "@/components/multi-image-upload";
import { keepFormSubmit } from "@/components/keep-form";
import { savePhotosAction, type PhotosState } from "./photos-actions";

// Fotos del negocio: el local, el equipo, los dueños. Dan confianza y
// personalidad; salen en el login, el menú QR y la tienda.
export function PhotosForm({ initial }: { initial: GalleryItem[] }) {
  const [state, formAction, pending] = useActionState<PhotosState, FormData>(
    savePhotosAction,
    undefined,
  );
  return (
    <form
      onSubmit={keepFormSubmit(formAction)}
      className="mt-6 rounded-2xl border border-gray-200 bg-white p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ImageIcon className="h-4 w-4" /> Fotos del negocio
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        El local, el equipo, los dueños o tus mejores platos (hasta 8). Salen en tu
        menú QR, en tu tienda y en la pantalla de acceso de tu panel.
      </p>
      <div className="mt-4">
        <MultiImageUpload name="photos" defaultItems={initial} label="Fotos" />
      </div>
      <div className="mt-4 flex items-center gap-3">
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
