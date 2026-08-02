import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  ShoppingBag,
  Package,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_BADGE, PAYMENT_LABEL } from "@/lib/order-status";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
});
const dayMonthFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
});

export default async function DashboardPage() {
  const { store } = await requireAdminStore();
  const brand = store.themeColor || "#111827";

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.product.findMany({ where: { storeId: store.id } }),
  ]);

  // Facturado = solo pedidos PAGADOS (dinero realmente recibido).
  const revenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((n, o) => n + o.totalCents, 0);
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const lowStock = products
    .filter((p) => p.stock < 5)
    .sort((a, b) => a.stock - b.stock);

  // Ventas de los últimos 14 días (suma por día, sin cancelados).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return { date: d, cents: 0, count: 0 };
  });
  const dayIndex = new Map(days.map((d, i) => [d.date.getTime(), i]));
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    const od = new Date(o.createdAt);
    od.setHours(0, 0, 0, 0);
    const idx = dayIndex.get(od.getTime());
    if (idx !== undefined) {
      days[idx].cents += o.totalCents;
      days[idx].count += 1;
    }
  }
  const revenue14 = days.reduce((n, d) => n + d.cents, 0);

  // Estado de envío (pipeline operativo), sin cancelados.
  const active = orders.filter((o) => o.status !== "CANCELLED");
  const fulfil = {
    pending: active.filter((o) => o.fulfillment === "PENDING").length,
    shipped: active.filter((o) => o.fulfillment === "SHIPPED").length,
    delivered: active.filter((o) => o.fulfillment === "DELIVERED").length,
  };
  const statusSegments = [
    { label: "Por enviar", value: fulfil.pending, color: "#f59e0b" },
    { label: "Enviado", value: fulfil.shipped, color: "#3b82f6" },
    { label: "Entregado", value: fulfil.delivered, color: "#16a34a" },
  ];

  // Productos más vendidos (por unidades).
  const soldByName = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    for (const it of o.items) {
      soldByName.set(it.name, (soldByName.get(it.name) ?? 0) + it.quantity);
    }
  }
  const topProducts = [...soldByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
        <p className="text-sm text-gray-500">Cómo va {store.name}.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Facturado"
          value={formatPrice(revenue, store.currency)}
          sub="solo pagados"
          icon={<Wallet className="h-5 w-5" />}
          tint="green"
        />
        <StatCard
          label="Pedidos"
          value={String(orders.length)}
          sub={`${pending} pendientes`}
          icon={<ShoppingBag className="h-5 w-5" />}
          tint="blue"
        />
        <StatCard
          label="Productos"
          value={String(products.length)}
          icon={<Package className="h-5 w-5" />}
          tint="gray"
        />
        <StatCard
          label="Stock bajo"
          value={String(lowStock.length)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tint={lowStock.length > 0 ? "amber" : "gray"}
          highlight={lowStock.length > 0}
        />
      </div>

      {/* Ventas + estados */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Ventas (últimos 14 días)"
            action={{ href: "/admin/orders", label: "Ver pedidos" }}
          >
            <div className="px-5 py-4">
              <div className="mb-3 text-2xl font-bold text-gray-900">
                {formatPrice(revenue14, store.currency)}
              </div>
              <SalesChart days={days} color={brand} currency={store.currency} />
            </div>
          </Panel>
        </div>

        <Panel title="Estado de pedidos">
          <div className="px-5 py-4">
            <StatusDonut segments={statusSegments} total={active.length} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pedidos recientes */}
        <Panel
          title="Pedidos recientes"
          action={{ href: "/admin/orders", label: "Ver todos" }}
        >
          {recentOrders.length === 0 ? (
            <Empty>Aún no hay pedidos.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-gray-50"
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Más vendidos */}
        <Panel title="Más vendidos">
          {topProducts.length === 0 ? (
            <Empty>Todavía no hay ventas.</Empty>
          ) : (
            <div className="space-y-3 px-5 py-4">
              {topProducts.map(([name, qty]) => {
                const max = topProducts[0][1] || 1;
                const w = Math.max(6, (qty / max) * 100);
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate pr-2 text-gray-800">{name}</span>
                      <span className="shrink-0 font-medium text-gray-900">
                        {qty} ud.
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${w}%`, backgroundColor: brand }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Stock bajo */}
      {lowStock.length > 0 && (
        <Panel
          title="Productos con stock bajo"
          action={{ href: "/admin/products", label: "Gestionar" }}
        >
          <ul className="divide-y divide-gray-100">
            {lowStock.slice(0, 6).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span className="text-gray-800">{p.name}</span>
                <span
                  className={`font-medium ${p.stock === 0 ? "text-red-500" : "text-amber-600"}`}
                >
                  {p.stock === 0 ? "Agotado" : `${p.stock} uds.`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

// Gráfico de barras de ventas por día (CSS puro).
function SalesChart({
  days,
  color,
  currency,
}: {
  days: { date: Date; cents: number; count: number }[];
  color: string;
  currency: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.cents));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {days.map((d, i) => {
          const h = d.cents > 0 ? Math.max(3, (d.cents / max) * 100) : 0;
          return (
            <div
              key={i}
              title={`${dayMonthFmt.format(d.date)} · ${formatPrice(d.cents, currency)} · ${d.count} pedido${d.count === 1 ? "" : "s"}`}
              className="flex flex-1 items-end"
              style={{ height: "100%" }}
            >
              <div
                className="w-full rounded-t transition-opacity hover:opacity-80"
                style={{
                  height: `${h}%`,
                  backgroundColor: d.cents > 0 ? color : "#e5e7eb",
                  minHeight: d.cents > 0 ? 3 : 2,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{dayMonthFmt.format(days[0].date)}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

// Dona de estados (SVG puro) con leyenda.
function StatusDonut({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  const size = 132;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Aún no hay pedidos.
      </p>
    );
  }

  // Longitudes y desplazamientos acumulados (sin mutar en el render).
  const nonZero = segments.filter((s) => s.value > 0);
  const lengths = nonZero.map((s) => (s.value / total) * c);
  const arcs = nonZero.map((s, i) => ({
    color: s.color,
    label: s.label,
    len: lengths[i],
    offset: -lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={stroke}
            />
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={`${a.len} ${c - a.len}`}
                strokeDashoffset={a.offset}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[11px] text-gray-400">pedidos</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
            <span className="font-medium text-gray-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TINTS: Record<string, string> = {
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  gray: "bg-gray-100 text-gray-500",
};

function StatCard({
  label,
  value,
  sub,
  icon,
  tint = "gray",
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tint?: "green" | "blue" | "amber" | "gray";
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        highlight ? "border-amber-300" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{label}</div>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${TINTS[tint]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-gray-400">{children}</p>;
}
