import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice, variantLabel } from "@/lib/utils";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
} from "@/lib/order-status";
import { updateOrderStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { store } = await requireAdminStore();

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-900"
        >
          ← Todos los pedidos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido #{order.id.slice(-8)}
            </h1>
            <p className="text-sm text-gray-500">
              {dateFmt.format(order.createdAt)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_BADGE[order.status]}`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        {/* Artículos */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
              Artículos
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-gray-800">
                    {i.name}
                    {variantLabel(i.color, i.size) && (
                      <span className="text-gray-400">
                        {" "}
                        · {variantLabel(i.color, i.size)}
                      </span>
                    )}{" "}
                    <span className="text-gray-400">×{i.quantity}</span>
                  </span>
                  <span className="text-gray-900">
                    {formatPrice(i.priceCents * i.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-gray-200 px-5 py-3">
              <span className="font-medium text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(order.totalCents, order.currency)}
              </span>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <h2 className="mb-3 font-semibold text-gray-900">Cliente</h2>
            <dl className="space-y-1.5 text-gray-600">
              <Row label="Nombre" value={order.customerName} />
              <Row label="Email" value={order.customerEmail} />
              {order.customerPhone && (
                <Row label="Teléfono" value={order.customerPhone} />
              )}
            </dl>
          </div>

          {/* Dirección de envío */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <h2 className="mb-3 font-semibold text-gray-900">
              Dirección de envío
            </h2>
            {order.city ? (
              <dl className="space-y-1.5 text-gray-600">
                <Row label="Calle" value={order.street ?? "—"} />
                <Row label="Número" value={order.streetNumber ?? "—"} />
                <Row label="Ciudad" value={order.city} />
                <Row label="Código postal" value={order.postalCode ?? "—"} />
                <Row label="País" value={order.country ?? "—"} />
              </dl>
            ) : (
              // Pedido antiguo: solo tiene el texto combinado
              <p className="text-gray-800">{order.address}</p>
            )}
          </div>
        </div>

        {/* Cambiar estado */}
        <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Actualizar estado
          </h2>
          <div className="space-y-2">
            {ORDER_STATUSES.map((status) => (
              <form key={status} action={updateOrderStatusAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="status" value={status} />
                <button
                  disabled={status === order.status}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    status === order.status
                      ? "cursor-default border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {ORDER_STATUS_LABEL[status]}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
