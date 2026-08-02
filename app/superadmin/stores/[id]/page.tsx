import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Settings,
  LogIn,
  Download,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/guards";
import { formatPrice, variantLabel } from "@/lib/utils";
import { PAYMENT_BADGE, PAYMENT_LABEL } from "@/lib/order-status";
import { SalesBars, Donut, HBars } from "@/components/charts";
import { impersonateStoreAction } from "../../actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" });
const dayFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

export default async function SuperadminStoreDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      owner: { select: { email: true } },
      _count: { select: { products: true } },
    },
  });
  if (!store) notFound();

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.product.findMany({ where: { storeId: store.id } }),
  ]);

  const brand = store.themeColor || "#111827";
  const revenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((n, o) => n + o.totalCents, 0);
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const lowStock = products.filter((p) => p.stock < 5).length;

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

  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-8">
      <Link
        href="/superadmin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a tiendas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-sm text-gray-500">
            /{store.slug} · {store.owner.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" /> Ver tienda
          </Link>
          <a
            href={`/api/superadmin/export?store=${store.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
          <Link
            href={`/superadmin/stores/${store.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" /> Configurar
          </Link>
          <form action={impersonateStoreAction}>
            <input type="hidden" name="storeId" value={store.id} />
            <button className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
              <LogIn className="h-4 w-4" /> Entrar
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Facturado" value={formatPrice(revenue, store.currency)} sub="pagados" />
        <Stat label="Pedidos" value={String(orders.length)} sub={`${pending} pendientes`} />
        <Stat label="Productos" value={String(store._count.products)} />
        <Stat label="Stock bajo" value={String(lowStock)} highlight={lowStock > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Ventas (últimos 14 días)">
            <div className="px-5 py-4">
              <SalesBars days={dayPoints} color={brand} currency={store.currency} />
            </div>
          </Panel>
        </div>
        <Panel title="Estado de pedidos">
          <div className="px-5 py-4">
            <Donut segments={segments} total={active.length} centerLabel="pedidos" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Más vendidos">
          <div className="px-5 py-4">
            <HBars items={top} color={brand} />
          </div>
        </Panel>
        <Panel title="Pedidos recientes">
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Aún no hay pedidos.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">
                      {o.customerName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dateFmt.format(o.createdAt)} · #{o.id.slice(-6)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_BADGE[o.status]}`}
                    >
                      {PAYMENT_LABEL[o.status]}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(o.totalCents, o.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
