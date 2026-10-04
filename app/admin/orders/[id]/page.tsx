import Link from "next/link";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, CircleCheck, StickyNote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { reconcileOnlineOrders } from "@/lib/orders";
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
import { WhatsappNoticeButton } from "@/components/whatsapp-notice-button";
import { noticeText, type NoticeKind } from "@/lib/order-messages";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ,
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
  // Si fue un pago en línea que Wompi aprobó pero no nos avisó, se marca ya.
  await reconcileOnlineOrders({ storeId: store.id, id }, { limit: 1, maxAgeHours: 24 * 30 });

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: {
      // product.imageUrl sirve de respaldo para pedidos antiguos sin snapshot
      items: { include: { product: { select: { imageUrl: true } } } },
    },
  });
  if (!order) notFound();

  // Enlaces de WhatsApp al cliente (solo se usan si el admin activó ese canal).
  // El texto de "confirmado" cambia según el pago: pide el comprobante si
  // aún no llega, o dice que ya se recibió.
  const waNotice = (kind: NoticeKind) =>
    whatsappLink(
      order.customerPhone,
      noticeText(kind, order, store.name).lines.join("\n"),
    );
  const notices = [
    { kind: "confirmed" as const, label: "Confirmar pedido", Icon: CircleCheck },
    { kind: "shipped" as const, label: "Va en camino", Icon: Truck },
  ];
  const cancelled = order.status === "CANCELLED";
  const hasWa = !!waNotice("confirmed");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          prefetch={false}
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Todos los pedidos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Pedido #{order.id.slice(-8)}
            </h1>
            <p className="text-sm text-ink-3">
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        {/* Artículos */}
        <div className="space-y-6">
          {order.notes && (
            <div className="rounded-2xl border border-warn/40 bg-warn-soft px-5 py-3 text-sm text-warn-ink">
              <div className="flex items-center gap-1.5 font-semibold">
                <StickyNote className="h-4 w-4" /> Notas del cliente
              </div>
              <p className="mt-1 whitespace-pre-line">{order.notes}</p>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
              Artículos
            </div>
            <ul className="divide-y divide-line">
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
                    <div className="font-medium text-ink">{i.name}</div>
                    {i.modifiers && (
                      <div className="text-xs text-ink-2">{i.modifiers}</div>
                    )}
                    {i.note && (
                      <div className="mt-0.5 inline-flex rounded bg-warn-soft px-1.5 py-0.5 text-xs font-medium text-warn-ink">
                        Nota: {i.note}
                      </div>
                    )}
                    <div className="text-xs text-ink-3">
                      {[
                        i.color && `Color: ${i.color}`,
                        i.size && `Talla: ${i.size}`,
                        `Cantidad: ${i.quantity}`,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-ink">
                    {formatPrice(i.priceCents * i.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-line px-5 py-3 text-sm">
              <div className="flex justify-between text-ink-2">
                <span>Subtotal</span>
                <span>
                  {formatPrice(
                    order.totalCents - order.shippingCents,
                    order.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-ink-2">
                <span>Envío</span>
                <span>
                  {order.shippingCents > 0
                    ? formatPrice(order.shippingCents, order.currency)
                    : "Gratis"}
                </span>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <span className="font-medium text-ink">Total</span>
                <span className="text-lg font-bold text-ink">
                  {formatPrice(order.totalCents, order.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-3 font-semibold text-ink">Cliente</h2>
            <dl className="space-y-1.5 text-ink-2">
              <Row label="Nombre" value={order.customerName} />
              <Row label="Email" value={order.customerEmail} />
              {order.customerPhone && (
                <Row label="Teléfono" value={order.customerPhone} />
              )}
              {order.locationName && (
                <Row label="Sede" value={order.locationName} />
              )}
              {order.paymentMethod && (
                <Row
                  label="Método de pago"
                  value={paymentMethodLabel(order.paymentMethod)}
                />
              )}
            </dl>
          </div>

          {/* Dirección de envío */}
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-3 font-semibold text-ink">
              Dirección de envío
            </h2>
            {order.street || order.city ? (
              <dl className="space-y-1.5 text-ink-2">
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
              <p className="text-ink">{order.address}</p>
            )}
          </div>
        </div>

        {/* Cambiar estados (pago y envío por separado) */}
        <div className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Pago</h2>
            <PaymentSelect orderId={order.id} value={order.status} />
          </div>
          <div className="border-t border-line pt-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">Estado del pedido</h2>
            <FulfillmentSelect orderId={order.id} value={order.fulfillment} />
          </div>
        </div>

        {/* Avisar al cliente (canales según los ajustes de la tienda) */}
        <div className="h-fit rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Avisar al cliente
          </h2>

          {cancelled ? (
            <p className="text-xs text-ink-3">
              El pedido está cancelado: no se envían avisos.
            </p>
          ) : store.notifyEmail || store.notifyWhatsapp ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {notices.map(({ kind, label, Icon }) => {
                  const wa = waNotice(kind);
                  return (
                    <div key={kind}>
                      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
                        <Icon className="h-4 w-4" /> {label}
                      </p>
                      <div className="space-y-2">
                        {store.notifyWhatsapp && wa && (
                          <WhatsappNoticeButton
                            href={wa}
                            orderId={order.id}
                            kind={kind}
                          />
                        )}
                        {store.notifyEmail && (
                          <NotifyEmailButton orderId={order.id} kind={kind} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Confirma antes o después del comprobante: el mensaje se ajusta
                solo (pide el comprobante si el pago sigue pendiente). Al
                avisar, el pedido pasa a ese estado.
              </p>
              {store.notifyWhatsapp && !hasWa && (
                <p className="mt-2 text-xs text-warn-ink">
                  El teléfono del cliente no es válido para WhatsApp; usa email.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-3">
              Activa los avisos (email o WhatsApp) en{" "}
              <span className="font-medium">Ajustes</span>.
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
      <dt className="w-24 shrink-0 text-ink-3">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
