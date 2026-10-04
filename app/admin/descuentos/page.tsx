import { ChevronDown, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { TZ } from "@/lib/dates";
import { DiscountForm, type DiscountData } from "./discount-form";
import { deleteDiscountAction } from "./actions";

export const dynamic = "force-dynamic";

// "YYYY-MM-DDTHH:mm" en hora de Colombia (para el campo datetime-local).
const localValue = (d: Date | null) => {
  if (!d) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
/** Estado del descuento según la fecha actual. */
function discountStatus(d: { active: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const now = Date.now();
  if (!d.active) return { label: "Pausado", cls: "bg-surface-3 text-ink-3" };
  if (d.endsAt && d.endsAt.getTime() <= now) return { label: "Vencido", cls: "bg-surface-3 text-ink-3" };
  if (d.startsAt && d.startsAt.getTime() > now) return { label: "Programado", cls: "bg-info-soft text-info-ink" };
  return { label: "Vigente", cls: "bg-ok-soft text-ok-ink" };
}

const dateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });

// Descuentos por porcentaje sobre productos existentes. Se aplican solos en
// la tienda, el menú QR y al cobrar.
export default async function DiscountsPage() {
  const { store } = await requireAdminStore();
  const [discounts, categories, products] = await Promise.all([
    prisma.discount.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { storeId: store.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true, category: { select: { name: true } } },
    }),
  ]);
  const prods = products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, categoryName: p.category?.name ?? null }));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Percent className="h-6 w-6" /> Descuentos
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Un porcentaje de descuento sobre productos que ya tienes. Se aplica solo en tu tienda,
          tu menú QR y al cobrar, con la etiqueta de oferta. Si un producto tiene además un precio
          de oferta, se cobra el más bajo.
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Nuevo descuento</h2>
        <DiscountForm categories={categories} products={prods} currency={store.currency} />
      </section>

      {discounts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Tus descuentos ({discounts.length})</h2>
          {discounts.map((d) => {
            const st = discountStatus(d);
            const target =
              d.scope === "all"
                ? "Toda la tienda"
                : d.scope === "categories"
                  ? d.categoryIds.map((id) => catName.get(id)).filter(Boolean).join(", ")
                  : `${d.productIds.length} producto${d.productIds.length === 1 ? "" : "s"}`;
            const data: DiscountData = {
              id: d.id,
              name: d.name,
              percent: d.percent,
              scope: d.scope,
              categoryIds: d.categoryIds,
              productIds: d.productIds,
              startsAt: localValue(d.startsAt),
              endsAt: localValue(d.endsAt),
              active: d.active,
            };
            return (
              <details key={d.id} className="group rounded-2xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-base font-extrabold text-brand-text">
                    -{d.percent}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{d.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {target}
                      {d.endsAt ? ` · hasta ${dateFmt.format(d.endsAt)}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-line p-5">
                  <DiscountForm discount={data} categories={categories} products={prods} currency={store.currency} />
                  <form action={deleteDiscountAction} className="mt-3">
                    <input type="hidden" name="id" value={d.id} />
                    <button className="rounded-md border border-bad/30 px-3 py-1.5 text-xs text-bad-ink hover:bg-bad-soft">
                      Borrar descuento
                    </button>
                  </form>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}
