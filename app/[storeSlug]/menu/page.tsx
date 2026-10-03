import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice, safePosition } from "@/lib/utils";
import { parseModifiers } from "@/lib/modifiers";
import { getStoreOpenState } from "@/lib/store-hours";

export const dynamic = "force-dynamic";

// Menú de SOLO LECTURA para el QR de las mesas: muestra la carta con fotos y
// precios, sin carrito ni botones de compra (en el local se pide al mesero).
export const metadata: Metadata = {
  title: "Menú",
  robots: { index: false }, // la carta ya está en la tienda; evita duplicados
};

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ sede?: string }>;
}) {
  const { storeSlug } = await params;
  const { sede } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      currency: true,
      hoursJson: true,
      categories: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } },
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          salePriceCents: true,
          imageUrl: true,
          imagePosition: true,
          imageZoom: true,
          modifiersJson: true,
          categoryId: true,
        },
      },
    },
  });
  if (!store) notFound();

  // Sede del QR (opcional): solo se muestra si existe en esta tienda.
  const location =
    typeof sede === "string" && sede.length <= 100
      ? await prisma.storeLocation.findFirst({
          where: { storeId: store.id, name: sede },
          select: { name: true, address: true },
        })
      : null;

  const open = getStoreOpenState(store.hoursJson);

  // Secciones por categoría (en el orden de las categorías) y "Otros" al final.
  const sections = [
    ...store.categories.map((c) => ({
      id: c.slug,
      name: c.name,
      products: store.products.filter((p) => p.categoryId === c.id),
    })),
    {
      id: "otros",
      name: "Otros",
      products: store.products.filter(
        (p) => !p.categoryId || !store.categories.some((c) => c.id === p.categoryId),
      ),
    },
  ].filter((s) => s.products.length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Portada */}
      <div className="text-center">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoUrl}
            alt={store.name}
            className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--brand)] text-white">
            <UtensilsCrossed className="h-9 w-9" />
          </span>
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          {store.name}
        </h1>
        <p className="mt-1 text-sm font-medium uppercase tracking-widest text-[var(--brand)]">
          Menú
        </p>
        {location && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {location.name}
            {location.address ? ` · ${location.address}` : ""}
          </p>
        )}
        {open.enforced && (
          <p className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${open.isOpen ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${open.isOpen ? "bg-green-500" : "bg-amber-500"}`}
              />
              {open.isOpen ? "Abierto" : "Cerrado"}
              {open.message ? ` · ${open.message}` : ""}
            </span>
          </p>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="mt-12 text-center text-gray-500">
          El menú se está actualizando. Pregunta a tu mesero.
        </p>
      ) : (
        <>
          {/* Categorías: saltan a su sección */}
          {sections.length > 1 && (
            <nav className="sticky top-[57px] z-[5] -mx-4 mt-8 flex gap-2 overflow-x-auto border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="shrink-0 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  {s.name}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-6 space-y-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-32">
                <h2 className="mb-3 text-xl font-bold text-gray-900">{s.name}</h2>
                <ul className="divide-y divide-gray-100">
                  {s.products.map((p) => {
                    const onSale =
                      p.salePriceCents != null &&
                      p.salePriceCents > 0 &&
                      p.salePriceCents < p.priceCents;
                    const extras = parseModifiers(p.modifiersJson)
                      .flatMap((g) => g.options)
                      .filter((o) => o.priceCents > 0);
                    return (
                      <li key={p.id} className="flex gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          {p.description && (
                            <p className="mt-1 line-clamp-3 text-sm text-gray-500">
                              {p.description}
                            </p>
                          )}
                          <p className="mt-2 flex items-baseline gap-2">
                            <span className="font-bold text-gray-900">
                              {formatPrice(onSale ? p.salePriceCents! : p.priceCents, store.currency)}
                            </span>
                            {onSale && (
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(p.priceCents, store.currency)}
                              </span>
                            )}
                          </p>
                          {extras.length > 0 && (
                            <p className="mt-1.5 text-xs text-gray-400">
                              Adiciones:{" "}
                              {extras
                                .slice(0, 6)
                                .map((o) => `${o.name} +${formatPrice(o.priceCents, store.currency)}`)
                                .join(" · ")}
                              {extras.length > 6 ? " · …" : ""}
                            </p>
                          )}
                        </div>
                        {p.imageUrl && (
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-28">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              style={{
                                objectPosition: safePosition(p.imagePosition),
                                transform: `scale(${p.imageZoom ?? 1})`,
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <p className="mt-12 rounded-2xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500">
        Para pedir, llama a tu mesero o acércate a la caja.
      </p>
    </div>
  );
}
