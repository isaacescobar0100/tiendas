import { redirect } from "next/navigation";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { reconcileOnlineOrders } from "@/lib/orders";
import { formatPrice, variantLabel } from "@/lib/utils";
import { getCurrentSede } from "@/lib/sede-auth";
import { SedeFulfillmentSelect } from "@/components/sede-fulfillment-select";
import { SedePaymentSelect } from "@/components/sede-payment-select";
import { WhatsappNoticeButton } from "@/components/whatsapp-notice-button";
import { whatsappLink } from "@/lib/whatsapp";
import { noticeText } from "@/lib/order-messages";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ,
  dateStyle: "short",
  timeStyle: "short",
});

export default async function SedeOrders() {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");
  // Pagos en línea aprobados en Wompi que no nos llegaron por webhook.
  await reconcileOnlineOrders({ storeId: sede.storeId, locationName: sede.name });
  const storeName = sede.store.name;

  const orders = await prisma.order.findMany({
    where: { storeId: sede.storeId, locationName: sede.name },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 200,
  });
  const pending = orders.filter((o) => o.fulfillment !== "DELIVERED").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Pedidos de tu sede</h1>
        <p className="text-sm text-ink-3">
          {orders.length} pedido{orders.length === 1 ? "" : "s"} · {pending} por
          atender.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-2 bg-surface p-12 text-center">
          <PackageSearch className="mx-auto h-9 w-9 text-ink-4" />
          <p className="mt-3 text-ink-3">
            Aún no hay pedidos para esta sede.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    #{o.id.slice(-8)} · {o.customerName}
                  </p>
                  <p className="text-xs text-ink-3">
                    {dateFmt.format(o.createdAt)}
                    {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                    {o.paymentMethod
                      ? ` · ${paymentMethodLabel(o.paymentMethod)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-ink-3">
                    Pago
                    <SedePaymentSelect orderId={o.id} current={o.status} />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-ink-3">
                    Estado
                    <SedeFulfillmentSelect
                      orderId={o.id}
                      current={o.fulfillment}
                    />
                  </label>
                </div>
              </div>

              <SedeNotice order={o} storeName={storeName} />

              <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span className="text-ink-2">
                      {i.name}
                      {variantLabel(i.color, i.size) && (
                        <span className="text-ink-3">
                          {" "}
                          ({variantLabel(i.color, i.size)})
                        </span>
                      )}{" "}
                      <span className="text-ink-3">×{i.quantity}</span>
                      {i.modifiers && (
                        <span className="block text-xs text-ink-3">
                          {i.modifiers}
                        </span>
                      )}
                      {i.note && (
                        <span className="mt-0.5 inline-block rounded bg-warn-soft px-1.5 py-0.5 text-xs font-medium text-warn-ink">
                          Nota: {i.note}
                        </span>
                      )}
                    </span>
                    <span className="text-ink">
                      {formatPrice(i.priceCents * i.quantity, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              {o.notes && (
                <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
                  <span className="font-semibold">Notas del cliente:</span> {o.notes}
                </p>
              )}

              <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                <span className="text-xs text-ink-3">
                  Entrega: {o.address}
                </span>
                <span className="font-bold text-ink">
                  {formatPrice(o.totalCents, o.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Siguiente aviso al cliente por WhatsApp: confirmar el pedido (pide el
// comprobante si el pago sigue pendiente) o avisar que va en camino.
function SedeNotice({
  order,
  storeName,
}: {
  order: Parameters<typeof noticeText>[1] & {
    customerPhone: string | null;
    fulfillment: string;
  };
  storeName: string;
}) {
  if (order.status === "CANCELLED") return null;
  const kind =
    order.fulfillment === "PENDING"
      ? "confirmed"
      : order.fulfillment === "CONFIRMED"
        ? "shipped"
        : null;
  if (!kind) return null;
  const href = whatsappLink(
    order.customerPhone,
    noticeText(kind, order, storeName).lines.join("\n"),
  );
  if (!href) return null;
  return (
    <div className="mt-3">
      <WhatsappNoticeButton
        href={href}
        orderId={order.id}
        kind={kind}
        panel="sede"
        label={kind === "confirmed" ? "Confirmar por WhatsApp" : "Avisar: va en camino"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ok px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
      />
    </div>
  );
}
