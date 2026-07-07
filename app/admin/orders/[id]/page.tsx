import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Truck, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import {
  PAYMENT_LABEL,
  PAYMENT_BADGE,
  FULFILLMENT_LABEL,
  FULFILLMENT_BADGE,
} from "@/lib/order-status";
import {
  PaymentSelect,
  FulfillmentSelect,
} from "@/components/order-status-select";
import { NotifyEmailButton } from "@/components/notify-email-button";

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
    include: {
      // product.imageUrl sirve de respaldo para pedidos antiguos sin snapshot
      items: { include: { product: { select: { imageUrl: true } } } },
    },
  });
  if (!order) notFound();

  // Mensajes de WhatsApp al cliente (según el estado del pedido).
  const short = order.id.slice(-8);
  const total = formatPrice(order.totalCents, order.currency);
  const waShipped = whatsappLink(
    order.customerPhone,
    `Hola ${order.customerName}! 🚚 Tu pedido #${short} de ${store.name} ya va en camino.\n` +
      `Envío a: ${order.address}\nTotal: ${total}\n¡Gracias por tu compra!`,
  );
  const waDelivered = whatsappLink(
    order.customerPhone,
    `Hola ${order.customerName}! ✅ Tu pedido #${short} de ${store.name} fue entregado. ` +
      `¡Gracias por tu compra! Esperamos que lo disfrutes 😊`,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Todos los pedidos
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
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${PAYMENT_BADGE[order.status]}`}
            >
              {PAYMENT_LABEL[order.status]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${FULFILLMENT_BADGE[order.fulfillment]}`}
            >
              {FULFILLMENT_LABEL[order.fulfillment]}
            </span>
          </div>
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
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      i.imageUrl ||
                      i.product?.imageUrl ||
                      "https://placehold.co/48x48?text=%20"
                    }
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{i.name}</div>
                    <div className="text-xs text-gray-500">
                      {[
                        i.color && `Color: ${i.color}`,
                        i.size && `Talla: ${i.size}`,
                        `Cantidad: ${i.quantity}`,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-gray-900">
                    {formatPrice(i.priceCents * i.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-gray-200 px-5 py-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>
                  {formatPrice(
                    order.totalCents - order.shippingCents,
                    order.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span>
                  {order.shippingCents > 0
                    ? formatPrice(order.shippingCents, order.currency)
                    : "Gratis"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </div>
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
            {order.street || order.city ? (
              <dl className="space-y-1.5 text-gray-600">
                <Row label="Dirección" value={order.street ?? "—"} />
                {order.neighborhood && (
                  <Row label="Barrio" value={order.neighborhood} />
                )}
                <Row label="Ciudad" value={order.city ?? "—"} />
                {order.reference && (
                  <Row label="Referencia" value={order.reference} />
                )}
                {order.postalCode && (
                  <Row label="Código postal" value={order.postalCode} />
                )}
                <Row label="País" value={order.country ?? "—"} />
              </dl>
            ) : (
              // Pedido antiguo: solo tiene el texto combinado
              <p className="text-gray-800">{order.address}</p>
            )}
          </div>
        </div>

        {/* Cambiar estados (pago y envío por separado) */}
        <div className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Pago</h2>
            <PaymentSelect orderId={order.id} value={order.status} />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Envío</h2>
            <FulfillmentSelect orderId={order.id} value={order.fulfillment} />
          </div>
        </div>

        {/* Avisar al cliente (WhatsApp o Email) según el estado */}
        <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Avisar al cliente
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Truck className="h-4 w-4" /> Va en camino
              </p>
              <div className="space-y-2">
                {waShipped && (
                  <a
                    href={waShipped}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                <NotifyEmailButton orderId={order.id} kind="shipped" />
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <PackageCheck className="h-4 w-4" /> Entregado
              </p>
              <div className="space-y-2">
                {waDelivered && (
                  <a
                    href={waDelivered}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                <NotifyEmailButton orderId={order.id} kind="delivered" />
              </div>
            </div>
          </div>

          {!waShipped && (
            <p className="mt-3 text-xs text-gray-400">
              {order.customerPhone
                ? `El teléfono (${order.customerPhone}) no sirve para WhatsApp; puedes avisar por email.`
                : "El cliente no dejó teléfono; puedes avisar por email."}
            </p>
          )}
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
