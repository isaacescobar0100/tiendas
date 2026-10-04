import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { activeDiscounts, applyDiscounts } from "@/lib/discounts";
import { formatPrice, safePosition } from "@/lib/utils";
import { parseModifiers } from "@/lib/modifiers";
import { getStoreOpenState } from "@/lib/store-hours";
import { parseStorePhoto } from "@/lib/store-photos";
import { MenuView, type MenuItem, type MenuSection } from "@/components/menu/menu-view";
import { storeUrl, menuJsonLd, clip } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";

export const dynamic = "force-dynamic";

// Menú de SOLO LECTURA para el QR de las mesas: la carta con fotos y precios,
// sin carrito ni botones de compra (en el local se pide al mesero).
// Se indexa: "menú de <tienda>" es una búsqueda muy común (SEO y GEO). La
// dirección canónica no lleva la mesa ni la sede.
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { name: true, slug: true, customDomain: true, seoCity: true, logoUrl: true, categories: { select: { name: true }, orderBy: { name: "asc" } } },
  });
  if (!store) return { title: "Menú" };
  const canonical = storeUrl(store, "/menu");
  const cats = store.categories.map((c) => c.name.toLowerCase()).slice(0, 6).join(", ");
  const description = clip(`Carta de ${store.name}${store.seoCity ? ` en ${store.seoCity}` : ""} con fotos y precios${cats ? `: ${cats}` : ""}.`, 160);
  return {
    title: store.seoCity ? `Menú y precios en ${store.seoCity}` : "Menú y precios",
    description,
    alternates: { canonical },
    openGraph: { title: `Menú de ${store.name}`, description, url: canonical, images: store.logoUrl ? [store.logoUrl] : [], locale: "es_CO" },
  };
}

const menuPrice = formatPrice; // "$18.000" (mismo formato que toda la tienda)

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ sede?: string; mesa?: string }>;
}) {
  const { storeSlug } = await params;
  const { sede, mesa } = await searchParams;

  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      type: true,
      seoCity: true,
      seoKeywords: true,
      logoUrl: true,
      currency: true,
      hoursJson: true,
      menuBgJson: true,
      categories: { orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } },
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
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

  // QR de una mesa (?mesa=<id>): muestra la mesa y su sede (un QR general,
  // solo la sede).
  const table =
    typeof mesa === "string" && mesa.length <= 40
      ? await prisma.diningTable.findFirst({
          where: { id: mesa, storeId: store.id },
          select: { name: true, general: true, location: { select: { name: true, address: true } } },
        })
      : null;

  // Sede del QR (opcional): solo se muestra si existe en esta tienda.
  const location =
    table?.location ??
    (typeof sede === "string" && sede.length <= 100
      ? await prisma.storeLocation.findFirst({
          where: { storeId: store.id, name: sede },
          select: { name: true, address: true },
        })
      : null);

  const openState = getStoreOpenState(store.hoursJson);
  // Descuentos vigentes: el menú muestra el mismo precio que se cobra.
  const rules = await activeDiscounts(store.id);
  store.products = applyDiscounts(store.products, rules);
  const cur = store.currency;

  const toItem = (p: (typeof store.products)[number]): MenuItem => {
    const onSale =
      p.salePriceCents != null && p.salePriceCents > 0 && p.salePriceCents < p.priceCents;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: menuPrice(onSale ? p.salePriceCents! : p.priceCents, cur),
      oldPrice: onSale ? menuPrice(p.priceCents, cur) : null,
      discount: onSale
        ? Math.round((1 - p.salePriceCents! / p.priceCents) * 100)
        : null,
      imageUrl: p.imageUrl,
      imagePosition: safePosition(p.imagePosition),
      imageZoom: p.imageZoom ?? 1,
      groups: parseModifiers(p.modifiersJson)
        .filter((g) => g.options.length > 0)
        .map((g) => ({
          name: g.name,
          options: g.options.map((o) => ({
            name: o.name,
            price: o.priceCents > 0 ? menuPrice(o.priceCents, cur) : null,
          })),
        })),
    };
  };

  // Secciones por categoría (en el orden de las categorías) y "Otros" al final.
  const known = new Set(store.categories.map((c) => c.id));
  const sections: MenuSection[] = [
    ...store.categories.map((c) => ({
      id: c.slug,
      name: c.name,
      items: store.products.filter((p) => p.categoryId === c.id).map(toItem),
    })),
    {
      id: "otros",
      name: "Otros",
      items: store.products
        .filter((p) => !p.categoryId || !known.has(p.categoryId))
        .map(toItem),
    },
  ].filter((s) => s.items.length > 0);

  // La carta completa en datos estructurados (Google y buscadores con IA).
  const known2 = new Set(store.categories.map((c) => c.id));
  const menuLd = menuJsonLd(
    store,
    [
      ...store.categories.map((c) => ({ name: c.name, items: store.products.filter((p) => p.categoryId === c.id) })),
      { name: "Otros", items: store.products.filter((p) => !p.categoryId || !known2.has(p.categoryId)) },
    ]
      .filter((g) => g.items.length)
      .map((g) => ({
        name: g.name,
        items: g.items.map((p) => ({
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          slug: p.slug,
          priceCents: p.salePriceCents && p.salePriceCents > 0 && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents,
        })),
      })),
    store.currency,
  );

  return (
    <>
    <JsonLd data={menuLd} />
    <MenuView
      storeName={store.name}
      logoUrl={store.logoUrl}
      location={location}
      table={table && !table.general ? table.name : null}
      open={
        openState.enforced
          ? { isOpen: openState.isOpen, message: openState.message ?? null }
          : null
      }
      sections={sections}
      cover={parseStorePhoto(store.menuBgJson)}
    />
    </>
  );
}
