import type { Promotion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { ImageUpload } from "@/components/image-upload";
import {
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";

export default async function PromotionsPage() {
  const { store } = await requireAdminStore();
  const promotions = await prisma.promotion.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Promociones (banner)</h1>
        <p className="text-sm text-gray-500">
          Cada promoción es una diapositiva del banner de tu tienda. Si hay más
          de una activa, el banner rota entre ellas. Si no hay ninguna, se
          muestra tu banner con el nombre de la tienda.
        </p>
      </div>

      {/* Nueva promoción */}
      <PromotionForm
        action={createPromotionAction}
        submitLabel="Añadir promoción"
        title="Nueva promoción"
      />

      {/* Existentes */}
      {promotions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Promociones creadas ({promotions.length})
          </h2>
          {promotions.map((p) => (
            <PromotionForm
              key={p.id}
              action={updatePromotionAction}
              promotion={p}
              submitLabel="Guardar cambios"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromotionForm({
  action,
  promotion,
  submitLabel,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>;
  promotion?: Promotion;
  submitLabel: string;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {title && (
        <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      )}
      <form action={action} className="space-y-4">
        {promotion && <input type="hidden" name="id" value={promotion.id} />}

        <ImageUpload
          name="imageUrl"
          label="Imagen de la promoción"
          defaultUrl={promotion?.imageUrl ?? undefined}
          aspect="wide"
        />

        <div>
          <label className={labelCls}>Título</label>
          <input
            name="title"
            defaultValue={promotion?.title ?? ""}
            placeholder="Ej: 50% en zapatillas"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Subtítulo</label>
          <input
            name="subtitle"
            defaultValue={promotion?.subtitle ?? ""}
            placeholder="Ej: Solo esta semana"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Enlace al hacer clic (opcional)</label>
          <input
            name="linkUrl"
            defaultValue={promotion?.linkUrl ?? ""}
            placeholder="Ej: /categoria o pega una dirección"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">
            Puedes enlazar a una categoría o producto de tu tienda, o a una
            dirección externa. Déjalo vacío si no quieres enlace.
          </p>
        </div>

        <div className="flex items-end gap-4">
          <div className="w-28">
            <label className={labelCls}>Orden</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={promotion?.sortOrder ?? 0}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={promotion ? promotion.active : true}
              className="h-4 w-4 rounded border-gray-300"
            />
            Activa (visible en la tienda)
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          {submitLabel}
        </button>
      </form>

      {promotion && (
        <form action={deletePromotionAction} className="mt-3">
          <input type="hidden" name="id" value={promotion.id} />
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
            Borrar promoción
          </button>
        </form>
      )}
    </div>
  );
}
