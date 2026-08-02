import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { isDelivered } from "@/lib/order-status";
import { getCurrentSede } from "@/lib/sede-auth";
import { SalesBars, Donut, HBars } from "@/components/charts";

export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

export default async function SedeDashboard() {
  const sede = await getCurrentSede();
  if (!sede) redirect("/sede/login");

  const orders = await prisma.order.findMany({
    where: { storeId: sede.storeId, locationName: sede.name },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 500,
  });

  const currency = sede.store.currency;
  const pending = orders.filter((o) => o.fulfillment !== "DELIVERED").length;
  const delivered = orders.filter((o) => isDelivered(o.fulfillment)).length;
  // Facturado = pedidos PAGADOS (dinero recibido), no los solo entregados.
  const revenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((n, o) => n + o.totalCents, 0);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen de tu sede</h1>
        <p className="text-sm text-gray-500">Cómo va {sede.name}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Facturado" value={formatPrice(revenue, currency)} sub="pagados" />
        <Stat label="Pedidos" value={String(orders.length)} sub={`${pending} por atender`} />
        <Stat label="Por atender" value={String(pending)} highlight={pending > 0} />
        <Stat label="Entregados" value={String(delivered)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Más vendidos</h2>
          </div>
          <div className="px-5 py-4">
            <HBars items={top} color="#111827" />
          </div>
        </div>
      )}
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
