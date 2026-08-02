import { redirect } from "next/navigation";
import { LogOut, Store, PackageSearch, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, variantLabel } from "@/lib/utils";
import {
  PAYMENT_LABEL,
  PAYMENT_BADGE,
  isDelivered,
} from "@/lib/order-status";
import { getCurrentSede } from "@/lib/sede-auth";
import { SalesBars, Donut, HBars } from "@/components/charts";
import { SedeFulfillmentSelect } from "@/components/sede-fulfillment-select";
import { sedeLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  dateStyle: "short",
  timeStyle: "short",
});
const dayFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

export default async function SedePanel() {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  const orders = await prisma.order.findMany({
    where: { storeId: sede.storeId, locationName: sede.name },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 100,
  });

  const currency = sede.store.currency;
  const pending = orders.filter((o) => o.fulfillment !== "DELIVERED").length;
  const revenue = orders
    .filter((o) => isDelivered(o.fulfillment))
    .reduce((n, o) => n + o.totalCents, 0);

  // Ventas 14 días
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return { date: d, cents: 0 };
  });
  const idx = new Map(days.map((d, i) => [d.date.getTime(), i]));
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    const od = new Date(o.createdAt);
    od.setHours(0, 0, 0, 0);
    const j = idx.get(od.getTime());
    if (j !== undefined) days[j].cents += o.totalCents;
  }
  const dayPoints = days.map((d) => ({
    label: dayFmt.format(d.date),
    cents: d.cents,
  }));

  const active = orders.filter((o) => o.status !== "CANCELLED");
  const segments = [
    {
      label: "Por enviar",
      value: active.filter((o) => o.fulfillment === "PENDING").length,
      color: "#f59e0b",
    },
    {
      label: "Enviado",
      value: active.filter((o) => o.fulfillment === "SHIPPED").length,
      color: "#3b82f6",
    },
    {
      label: "Entregado",
      value: active.filter((o) => o.fulfillment === "DELIVERED").length,
      color: "#16a34a",
    },
  ];

  const soldByName = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    for (const it of o.items) {
      soldByName.set(it.name, (soldByName.get(it.name) ?? 0) + it.quantity);
    }
  }
  const top = [...soldByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value, display: `${value} ud.` }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Store className="h-5 w-5 shrink-0 text-gray-700" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">
                {sede.name}
              </p>
              <p className="truncate text-xs text-gray-400">
                {sede.store.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/sede/export"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </a>
            <form action={sedeLogoutAction}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Resumen de tu sede</h1>
          <p className="text-sm text-gray-500">Cómo va {sede.name}.</p>
        </div>

        {/* Métricas */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Facturado" value={formatPrice(revenue, currency)} sub="entregados" />
          <Stat label="Pedidos" value={String(orders.length)} />
          <Stat label="Por atender" value={String(pending)} highlight={pending > 0} />
          <Stat
            label="Entregados"
            value={String(orders.filter((o) => isDelivered(o.fulfillment)).length)}
          />
        </div>

        {/* Gráficas */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Ventas (últimos 14 días)
              </h2>
            </div>
            <div className="px-5 py-4">
              <SalesBars days={dayPoints} color="#111827" currency={currency} />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Estado de pedidos
              </h2>
            </div>
            <div className="px-5 py-4">
              <Donut segments={segments} total={active.length} centerLabel="pedidos" />
            </div>
          </div>
        </div>

        {top.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Más vendidos</h2>
            </div>
            <div className="px-5 py-4">
              <HBars items={top} color="#111827" />
            </div>
          </div>
        )}

        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Pedidos ({orders.length} · {pending} por atender)
        </h2>

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
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_BADGE[o.status]}`}
                    >
                      {PAYMENT_LABEL[o.status]}
                    </span>
                    <SedeFulfillmentSelect
                      orderId={o.id}
                      current={o.fulfillment}
                    />
                  </div>
                </div>

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
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${highlight ? "border-amber-300" : "border-gray-200"}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
