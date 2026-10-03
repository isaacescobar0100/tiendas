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
  const store = await prisma.store.findUnique({
    where: { id: sede.storeId },
    select: { name: true },
  });
  const storeName = store?.name ?? "";

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
        <h1 className="text-2xl font-bold text-gray-900">Pedidos de tu sede</h1>
        <p className="text-sm text-gray-500">
          {orders.length} pedido{orders.length === 1 ? "" : "s"} · {pending} por
          atender.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <PackageSearch className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 text-gray-500">
            Aún no hay pedidos para esta sede.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    #{o.id.slice(-8)} · {o.customerName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {dateFmt.format(o.createdAt)}
                    {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                    {o.paymentMethod
                      ? ` · ${paymentMethodLabel(o.paymentMethod)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-400">
                    Pago
                    <SedePaymentSelect orderId={o.id} current={o.status} />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-400">
                    Estado
                    <SedeFulfillmentSelect
                      orderId={o.id}
                      current={o.fulfillment}
                    />
                  </label>
                </div>
              </div>

              <SedeNotice order={o} storeName={storeName} />

              <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span className="text-gray-600">
                      {i.name}
                      {variantLabel(i.color, i.size) && (
                        <span className="text-gray-400">
                          {" "}
                          ({variantLabel(i.color, i.size)})
                        </span>
                      )}{" "}
                      <span className="text-gray-400">×{i.quantity}</span>
                      {i.modifiers && (
                        <span className="block text-xs text-gray-400">
                          {i.modifiers}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-900">
                      {formatPrice(i.priceCents * i.quantity, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs text-gray-400">
                  Entrega: {o.address}
                </span>
                <span className="font-bold text-gray-900">
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
        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
      />
    </div>
  );
}
