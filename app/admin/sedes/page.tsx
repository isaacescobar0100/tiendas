import type { StoreLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import {
  createLocationAction,
  updateLocationAction,
  deleteLocationAction,
} from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";

export default async function SedesPage() {
  const { store } = await requireAdminStore();
  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sedes</h1>
        <p className="text-sm text-gray-500">
          Si tu negocio tiene varias sedes, agrégalas aquí con su WhatsApp. En la
          tienda, el botón de WhatsApp deja elegir la sede y se muestran las
          ubicaciones.
        </p>
      </div>

      <LocationForm action={createLocationAction} title="Nueva sede" submitLabel="Añadir sede" />

      {locations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Sedes ({locations.length})
          </h2>
          {locations.map((l) => (
            <LocationForm
              key={l.id}
              action={updateLocationAction}
              location={l}
              submitLabel="Guardar cambios"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LocationForm({
  action,
  location,
  submitLabel,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>;
  location?: StoreLocation;
  submitLabel: string;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {title && (
        <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      )}
      <form action={action} className="space-y-4">
        {location && <input type="hidden" name="id" value={location.id} />}
        <div>
          <label className={labelCls}>Nombre de la sede</label>
          <input
            name="name"
            required
            defaultValue={location?.name ?? ""}
            placeholder="Sede Las Nieves"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Dirección (opcional)</label>
          <input
            name="address"
            defaultValue={location?.address ?? ""}
            placeholder="Cra. 21 #47B-59, Barranquilla"
            className={inputCls}
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className={labelCls}>WhatsApp</label>
            <input
              name="whatsapp"
              inputMode="tel"
              defaultValue={location?.whatsapp ?? ""}
              placeholder="300 123 4567"
              className={inputCls}
            />
          </div>
          <div className="w-24">
            <label className={labelCls}>Orden</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={location?.sortOrder ?? 0}
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          {submitLabel}
        </button>
      </form>

      {location && (
        <form action={deleteLocationAction} className="mt-3">
          <input type="hidden" name="id" value={location.id} />
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
            Borrar sede
          </button>
        </form>
      )}
    </div>
  );
}
