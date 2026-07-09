import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  deleteStoreAction,
  toggleStoreActiveAction,
  toggleStorePaymentAction,
  resetAdminPasswordAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SuperadminHome({
  searchParams,
}: {
  searchParams: Promise<{ resetEmail?: string; tempPass?: string }>;
}) {
  const { resetEmail, tempPass } = await searchParams;
  const [stores, totalOrders, paidAgg] = await Promise.all([
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { email: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    // Total de pedidos no cancelados (para la tarjeta "Pedidos").
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    // Facturado: solo pedidos ENTREGADOS (dinero realmente recibido).
    prisma.order.aggregate({
      where: { fulfillment: "DELIVERED" },
      _sum: { totalCents: true },
    }),
  ]);

  const totalProducts = stores.reduce((n, s) => n + s._count.products, 0);
  // La facturación mezcla monedas; se muestra como referencia agregada en COP
  const grossCents = paidAgg._sum.totalCents ?? 0;

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
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
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
        * Suma de los pedidos ENTREGADOS (dinero ya recibido); los no entregados
        no cuentan (referencia; las tiendas pueden usar distintas monedas).
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
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tienda</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Pagos</th>
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
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      /{store.slug} <ExternalLink className="h-3 w-3" />
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
                    <div className="flex flex-wrap gap-1.5">
                      <PayToggle
                        storeId={store.id}
                        method="online"
                        label="En línea"
                        enabled={store.onlinePaymentEnabled}
                      />
                      <PayToggle
                        storeId={store.id}
                        method="cod"
                        label="Contraentrega"
                        enabled={store.codEnabled}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/superadmin/stores/${store.id}/edit`}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Configurar
                      </Link>
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

// Interruptor de un método de pago de la tienda (verde = activo).
function PayToggle({
  storeId,
  method,
  label,
  enabled,
}: {
  storeId: string;
  method: "online" | "cod";
  label: string;
  enabled: boolean;
}) {
  return (
    <form action={toggleStorePaymentAction}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="method" value={method} />
      <button
        title={enabled ? "Clic para desactivar" : "Clic para activar"}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
          enabled
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-gray-100 text-gray-400 line-through hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    </form>
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
