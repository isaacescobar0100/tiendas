import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { formatPrice } from "@/lib/utils";
import {
  PAYMENT_BADGE,
  PAYMENT_LABEL,
  isPaidStatus,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
});

export default async function DashboardPage() {
  const { store } = await requireAdminStore();

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    prisma.product.findMany({ where: { storeId: store.id } }),
  ]);

  // Facturado = solo pedidos cobrados (pagados/enviados). Pendientes no suman.
  const revenue = orders
    .filter((o) => isPaidStatus(o.status))
    .reduce((n, o) => n + o.totalCents, 0);
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const lowStock = products
    .filter((p) => p.stock < 5)
    .sort((a, b) => a.stock - b.stock);

  // Productos más vendidos (por unidades) a partir de los ítems de pedido
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
        />
        <StatCard label="Pedidos" value={String(orders.length)} sub={`${pending} pendientes`} />
        <StatCard label="Productos" value={String(products.length)} />
        <StatCard
          label="Stock bajo"
          value={String(lowStock.length)}
          highlight={lowStock.length > 0}
        />
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
            <ul className="divide-y divide-gray-100">
              {topProducts.map(([name, qty], i) => (
                <li
                  key={name}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-gray-400">{i + 1}.</span>
                    <span className="truncate text-gray-800">{name}</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    {qty} ud.
                  </span>
                </li>
              ))}
            </ul>
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

function StatCard({
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
      className={`rounded-2xl border bg-white p-5 ${
        highlight ? "border-amber-300" : "border-gray-200"
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
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
