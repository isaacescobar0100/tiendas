import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  deleteStoreAction,
  toggleStoreActiveAction,
  resetAdminPasswordAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SuperadminHome({
  searchParams,
}: {
  searchParams: Promise<{ resetEmail?: string; tempPass?: string }>;
}) {
  const { resetEmail, tempPass } = await searchParams;
  const [stores, orderAgg] = await Promise.all([
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { email: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalCents: true },
      _count: true,
    }),
  ]);

  const totalProducts = stores.reduce((n, s) => n + s._count.products, 0);
  const totalOrders = orderAgg._count;
  // La facturación mezcla monedas; se muestra como referencia agregada en USD
  const grossCents = orderAgg._sum.totalCents ?? 0;

  return (
    <div className="space-y-8">
      {resetEmail && tempPass && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="text-sm">
            <p className="font-medium text-amber-800">
              Contraseña restablecida para {resetEmail}
            </p>
            <p className="mt-1 text-amber-700">
              Nueva contraseña temporal:{" "}
              <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold">
                {tempPass}
              </span>{" "}
              — cópiala y compártela con el admin. No se volverá a mostrar.
            </p>
          </div>
          <Link
            href="/superadmin"
            className="shrink-0 text-amber-700 hover:text-amber-900"
          >
            ✕
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
          <p className="text-sm text-gray-500">
            Gestiona todas las tiendas de la plataforma.
          </p>
        </div>
        <Link
          href="/superadmin/stores/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + Nueva tienda
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Tiendas" value={String(stores.length)} />
        <StatCard
          label="Activas"
          value={String(stores.filter((s) => s.active).length)}
        />
        <StatCard label="Productos" value={String(totalProducts)} />
        <StatCard label="Pedidos" value={String(totalOrders)} />
        <StatCard label="Facturado*" value={formatPrice(grossCents)} />
      </div>
      <p className="-mt-4 text-xs text-gray-400">
        * Suma bruta de todos los pedidos no cancelados (referencia; las tiendas
        pueden usar distintas monedas).
      </p>

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Aún no hay tiendas.</p>
          <Link
            href="/superadmin/stores/new"
            className="mt-3 inline-block text-sm font-medium text-gray-900 underline"
          >
            Crea la primera
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tienda</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {store.name}
                    </div>
                    <Link
                      href={`/${store.slug}`}
                      target="_blank"
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      /{store.slug} ↗
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {store.owner.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {store._count.products}
                  </td>
                  <td className="px-4 py-3">
                    {store.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleStoreActiveAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          {store.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                      <form action={resetAdminPasswordAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          Resetear clave
                        </button>
                      </form>
                      <form action={deleteStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Borrar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
