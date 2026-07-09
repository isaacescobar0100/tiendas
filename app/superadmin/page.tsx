import Link from "next/link";
import { ExternalLink, X, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { SalesBars, HBars } from "@/components/charts";
import {
  deleteStoreAction,
  toggleStoreActiveAction,
  toggleStorePaymentAction,
  resetAdminPasswordAction,
  renewStoreAction,
  impersonateStoreAction,
} from "./actions";
import type { StorePlan } from "@prisma/client";

const dateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
const dayFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

export const dynamic = "force-dynamic";

export default async function SuperadminHome({
  searchParams,
}: {
  searchParams: Promise<{ resetEmail?: string; tempPass?: string }>;
}) {
  const { resetEmail, tempPass } = await searchParams;
  const [stores, totalOrders, paidAgg, revByStoreRaw] = await Promise.all([
    prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { email: true, name: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    // Total de pedidos no cancelados (para la tarjeta "Pedidos").
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    // Facturado: solo pedidos ENTREGADOS (dinero realmente recibido).
    prisma.order.aggregate({
      where: { fulfillment: "DELIVERED" },
      _sum: { totalCents: true },
    }),
    // Facturado por tienda (entregados) para el ranking.
    prisma.order.groupBy({
      by: ["storeId"],
      where: { fulfillment: "DELIVERED" },
      _sum: { totalCents: true },
    }),
  ]);

  // Ventas de los últimos 14 días (toda la plataforma, sin cancelados).
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() - 13);
  const recentOrders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: startDay } },
    select: { createdAt: true, totalCents: true },
  });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return { date: d, cents: 0 };
  });
  const dayIdx = new Map(days.map((d, i) => [d.date.getTime(), i]));
  for (const o of recentOrders) {
    const od = new Date(o.createdAt);
    od.setHours(0, 0, 0, 0);
    const j = dayIdx.get(od.getTime());
    if (j !== undefined) days[j].cents += o.totalCents;
  }
  const dayPoints = days.map((d) => ({
    label: dayFmt.format(d.date),
    cents: d.cents,
  }));

  const totalProducts = stores.reduce((n, s) => n + s._count.products, 0);
  // La facturación mezcla monedas; se muestra como referencia agregada en COP
  const grossCents = paidAgg._sum.totalCents ?? 0;

  const revByStore = new Map(
    revByStoreRaw.map((r) => [r.storeId, r._sum.totalCents ?? 0]),
  );

  // Rentas vencidas (fecha de pago ya pasada).
  const now = Date.now();
  const overdueCount = stores.filter(
    (s) => s.plan === "RENT" && s.paidUntil && s.paidUntil.getTime() < now,
  ).length;

  // Ranking: facturado por tienda (entregados).
  const rankItems = stores
    .map((s) => ({
      label: s.name,
      value: revByStore.get(s.id) ?? 0,
      display: formatPrice(revByStore.get(s.id) ?? 0, s.currency),
    }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {resetEmail && tempPass && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="text-sm">
            <p className="font-medium text-amber-800">
              Contraseña restablecida para {resetEmail}
            </p>
            <p className="mt-1 text-amber-700">
              Nueva contraseña temporal:{" "}
              <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold">
                {tempPass}
              </span>{" "}
              — cópiala y compártela con el admin. No se volverá a mostrar.
            </p>
          </div>
          <Link
            href="/superadmin"
            className="shrink-0 text-amber-700 hover:text-amber-900"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
          <p className="text-sm text-gray-500">
            Gestiona todas las tiendas de la plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/superadmin/export?store=all"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exportar todo
          </a>
          <Link
            href="/superadmin/stores/new"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Nueva tienda
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Tiendas" value={String(stores.length)} />
        <StatCard
          label="Activas"
          value={String(stores.filter((s) => s.active).length)}
        />
        <StatCard label="Productos" value={String(totalProducts)} />
        <StatCard label="Pedidos" value={String(totalOrders)} />
        <StatCard label="Facturado*" value={formatPrice(grossCents)} />
        <StatCard
          label="Rentas vencidas"
          value={String(overdueCount)}
          highlight={overdueCount > 0}
        />
      </div>
      <p className="-mt-4 text-xs text-gray-400">
        * Suma de los pedidos ENTREGADOS (dinero ya recibido); los no entregados
        no cuentan (referencia; las tiendas pueden usar distintas monedas).
      </p>

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Ventas de la plataforma (últimos 14 días)
            </h2>
          </div>
          <div className="px-5 py-4">
            <SalesBars days={dayPoints} color="#111827" currency="COP" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Facturado por tienda
            </h2>
          </div>
          <div className="px-5 py-4">
            <HBars items={rankItems} color="#111827" />
          </div>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Aún no hay tiendas.</p>
          <Link
            href="/superadmin/stores/new"
            className="mt-3 inline-block text-sm font-medium text-gray-900 underline"
          >
            Crea la primera
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tienda</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Facturado</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Pagos</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/stores/${store.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {store.name}
                    </Link>
                    <Link
                      href={`/${store.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      /{store.slug} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {store.owner.email}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatPrice(revByStore.get(store.id) ?? 0, store.currency)}
                    <div className="text-xs text-gray-400">
                      {store._count.products} prod.
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PlanCell plan={store.plan} paidUntil={store.paidUntil} />
                  </td>
                  <td className="px-4 py-3">
                    {store.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <PayToggle
                        storeId={store.id}
                        method="online"
                        label="En línea"
                        enabled={store.onlinePaymentEnabled}
                      />
                      <PayToggle
                        storeId={store.id}
                        method="cod"
                        label="Contraentrega"
                        enabled={store.codEnabled}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/superadmin/stores/${store.id}/edit`}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Configurar
                      </Link>
                      <form action={impersonateStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          Entrar
                        </button>
                      </form>
                      {store.plan === "RENT" && (
                        <form action={renewStoreAction}>
                          <input
                            type="hidden"
                            name="storeId"
                            value={store.id}
                          />
                          <button className="rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
                            Renovar +1 mes
                          </button>
                        </form>
                      )}
                      <form action={toggleStoreActiveAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          {store.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                      <form action={resetAdminPasswordAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                          Resetear clave
                        </button>
                      </form>
                      <form action={deleteStoreAction}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          Borrar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Celda de plan: "Venta única" o "Renta" con su fecha y estado.
function PlanCell({
  plan,
  paidUntil,
}: {
  plan: StorePlan;
  paidUntil: Date | null;
}) {
  if (plan === "SALE") {
    return <span className="text-xs text-gray-500">Venta única</span>;
  }
  if (!paidUntil) {
    return (
      <div>
        <div className="text-xs font-medium text-gray-700">Renta</div>
        <span className="text-xs text-amber-600">Sin fecha</span>
      </div>
    );
  }
  const days = Math.ceil((paidUntil.getTime() - Date.now()) / 86400000);
  const badge =
    days < 0
      ? "bg-red-100 text-red-700"
      : days <= 3
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  const label = days < 0 ? "Vencida" : days <= 3 ? "Vence pronto" : "Al día";
  return (
    <div>
      <div className="text-xs font-medium text-gray-700">Renta</div>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${badge}`}
      >
        {label}
      </span>
      <div className="mt-0.5 text-[11px] text-gray-400">
        {dateFmt.format(paidUntil)}
      </div>
    </div>
  );
}

// Interruptor de un método de pago de la tienda (verde = activo).
function PayToggle({
  storeId,
  method,
  label,
  enabled,
}: {
  storeId: string;
  method: "online" | "cod";
  label: string;
  enabled: boolean;
}) {
  return (
    <form action={toggleStorePaymentAction}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="method" value={method} />
      <button
        title={enabled ? "Clic para desactivar" : "Clic para activar"}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
          enabled
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-gray-100 text-gray-400 line-through hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        highlight ? "border-red-300" : "border-gray-200"
      }`}
    >
      <div
        className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
