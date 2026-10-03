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
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const labelCls = "mb-1 block text-sm font-medium text-ink-2";

export default async function SedesPage() {
  const { store } = await requireAdminStore();
  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const loginUrl = "/sede/login";
  // Cupo del plan (lo fija el superadmin). Las que ya existen se conservan.
  const { maxLocations } = await prisma.store.findUniqueOrThrow({
    where: { id: store.id },
    select: { maxLocations: true },
  });
  const full = locations.length >= maxLocations;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Sedes</h1>
        <p className="text-sm text-ink-3">
          Si tu negocio tiene varias sedes, agrégalas aquí con su WhatsApp. En el
          checkout el cliente elige la sede, y al confirmar puede enviarte el
          pedido por WhatsApp a esa sede para que lo prepares.
        </p>
      </div>

      <div className="rounded-2xl border border-info/30 bg-info-soft p-4 text-sm text-info-ink">
        <p className="font-medium">Acceso por sede</p>
        <p className="mt-1 text-info-ink">
          Dale a cada sede un <strong>correo y contraseña</strong> abajo. Cada
          sede entra en <span className="font-mono">{loginUrl}</span> y ve{" "}
          <strong>solo los pedidos de su sede</strong>. Tú (admin) sigues viendo
          todos en Pedidos.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <span className="text-ink-2">Sedes de tu plan</span>
        <span className="font-semibold text-ink">
          {locations.length} de {maxLocations}
        </span>
      </div>

      {full ? (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn-ink">
          Ya usas todas las sedes de tu plan. Para abrir otra sede, pide que
          amplíen tu plan.
        </p>
      ) : (
        <LocationForm action={createLocationAction} title="Nueva sede" submitLabel="Añadir sede" />
      )}

      {locations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">
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
    <div className="rounded-2xl border border-line bg-surface p-6">
      {title && (
        <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
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
            <label className={labelCls}>WhatsApp de la sede</label>
            <input
              name="whatsapp"
              inputMode="tel"
              defaultValue={location?.whatsapp ?? ""}
              placeholder="300 123 4567"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-ink-3">
              Al confirmar el pedido, el cliente podrá enviártelo por WhatsApp a
              este número para que lo prepares.
            </p>
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

        {/* Acceso propio de la sede */}
        <div className="rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-2">Acceso de la sede</p>
            {location?.email && (
              <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok-ink">
                Con acceso
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Correo de la sede</label>
              <input
                name="email"
                type="email"
                defaultValue={location?.email ?? ""}
                placeholder="lasnieves@surenos.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contraseña</label>
              <input
                name="password"
                type="password"
                placeholder={
                  location?.passwordHash
                    ? "•••• (déjalo vacío para no cambiarla)"
                    : "crea una clave (mín. 8)"
                }
                minLength={8}
                className={inputCls}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Con esto, la sede entra en{" "}
            <span className="font-mono">/sede/login</span> y ve solo sus pedidos.
            Si cambias el correo o la contraseña, se cierran las sesiones
            abiertas de esa sede.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:bg-brand-hover"
        >
          {submitLabel}
        </button>
      </form>

      {location && (
        <form action={deleteLocationAction} className="mt-3">
          <input type="hidden" name="id" value={location.id} />
          <button className="rounded-md border border-bad/30 px-3 py-1.5 text-xs text-bad-ink hover:bg-bad-soft">
            Borrar sede
          </button>
        </form>
      )}
    </div>
  );
}
