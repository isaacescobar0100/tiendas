import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  isPaidStatus,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function OrdersPage() {
  const { store } = await requireAdminStore();
  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  // Solo cuenta lo cobrado (pagado/enviado); pendientes y cancelados no suman.
  const revenue = orders
    .filter((o) => isPaidStatus(o.status))
    .reduce((n, o) => n + o.totalCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-500">
          {orders.length} pedido{orders.length === 1 ? "" : "s"} ·{" "}
          {formatPrice(revenue, store.currency)} facturado
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Todavía no has recibido pedidos.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Ciudad</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Artículos</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-gray-900 hover:underline"
                    >
                      #{o.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{o.customerName}</div>
                    <div className="text-xs text-gray-400">
                      {o.customerEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {o.city ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {dateFmt.format(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o._count.items}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatPrice(o.totalCents, o.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status]}`}
                    >
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
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
