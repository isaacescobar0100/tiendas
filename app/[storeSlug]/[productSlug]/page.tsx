import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock, MessageCircle, Truck, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { activeDiscounts, applyDiscount, applyDiscounts } from "@/lib/discounts";
import { formatPrice } from "@/lib/utils";
import { getStoreOpenState, isMerchProduct } from "@/lib/store-hours";
import { tracksStock } from "@/lib/store-type";
import { parseModifiers } from "@/lib/modifiers";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isOnSale, effectivePriceCents, discountPercent } from "@/lib/pricing";
import { AddToCart } from "@/components/cart/add-to-cart";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

type GalleryPic = { url: string; position: string; zoom: number };

/** Parsea el JSON de galería con encuadre, tolerante a datos malformados. */
function parseGalleryData(raw: string): GalleryPic[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((i) => ({
        url: String(i?.url ?? ""),
        position: typeof i?.position === "string" ? i.position : "50% 50%",
        zoom: Number(i?.zoom) || 1,
      }))
      .filter((i) => i.url);
  } catch {
    return [];
  }
}

async function getData(storeSlug: string, productSlug: string) {
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
  });
  if (!store) return null;
  const product = await prisma.product.findFirst({
    where: { storeId: store.id, slug: productSlug, active: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) return null;
  return { store, product };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug, productSlug } = await params;
  const data = await getData(storeSlug, productSlug);
  if (!data) return { title: "Producto no encontrado" };

  const { store, product } = data;
  const price = formatPrice(effectivePriceCents(product), store.currency);
  // Descripción para buscadores y para el preview al compartir (WhatsApp, etc.).
  const description = product.description
    ? `${price} · ${product.description.slice(0, 150)}`
    : `${price} · Cómpralo en ${store.name}.`;
  const images = product.imageUrl ? [product.imageUrl] : [];

  return {
    title: `${product.name} · ${store.name}`,
    description,
    openGraph: {
      title: product.name,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string; productSlug: string }>;
}) {
  const { storeSlug, productSlug } = await params;
  // Rutas de la tienda: sin el slug si se visita por su subdominio/dominio.
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const data = await getData(storeSlug, productSlug);
  if (!data) notFound();
  const { store } = data;
  // Descuento vigente (Admin > Descuentos): mismo cálculo que en el checkout.
  const rules = await activeDiscounts(store.id);
  const product = applyDiscount(data.product, rules);

  const onSale = isOnSale(product);
  const effectiveCents = effectivePriceCents(product);
  const pct = discountPercent(product);

  // Galería con encuadre: portada primero, luego las imágenes adicionales.
  const galleryItems = [
    ...(product.imageUrl
      ? [
          {
            url: product.imageUrl,
            position: product.imagePosition,
            zoom: product.imageZoom,
          },
        ]
      : []),
    ...parseGalleryData(product.galleryData),
  ];

  // Productos relacionados: misma tienda, priorizando la misma categoría
  const relatedRaw = await prisma.product.findMany({
    where: { storeId: store.id, active: true, id: { not: product.id } },
    orderBy: { createdAt: "desc" },
    include: {
      variants: { select: { id: true, color: true, size: true, stock: true } },
    },
    take: 12,
  });
  const related = applyDiscounts(relatedRaw, rules)
    .sort(
      (a, b) =>
        (b.categoryId === product.categoryId ? 1 : 0) -
        (a.categoryId === product.categoryId ? 1 : 0),
    )
    .slice(0, 4);

  // Reseñas del producto (lista) + cliente en sesión.
  const [reviews, customer] = await Promise.all([
    prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getCurrentCustomer(store.id),
  ]);
  const reviewCount = reviews.length;
  const reviewAvg =
    reviewCount > 0
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviewCount
      : 0;
  const myReview = customer
    ? reviews.find((r) => r.customerId === customer.id) ?? null
    : null;
  const reviewDateFmt = new Intl.DateTimeFormat("es", { timeZone: TZ, dateStyle: "medium" });

  // Datos para "Cómo comprar" (todo sale de la configuración real de la tienda).
  const openState = getStoreOpenState(store.hoursJson);
  const sedes = await prisma.storeLocation.count({ where: { storeId: store.id } });
  const payMethods = [
    store.transferEnabled && "Transferencia / QR",
    store.codEnabled && "Contra entrega",
    store.onlinePaymentEnabled && "Tarjeta o PSE",
  ].filter(Boolean) as string[];
  const shippingText =
    store.shippingCents === 0
      ? "Envío gratis"
      : `Envío ${formatPrice(store.shippingCents, store.currency)}${
          store.freeShippingOverCents ? ` · gratis desde ${formatPrice(store.freeShippingOverCents, store.currency)}` : ""
        }`;

  return (
    <div>
      <Link
        href={sh()}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Seguir comprando
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative">
          <div className="absolute right-3 top-3 z-10">
            <FavoriteButton
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: effectiveCents,
                imageUrl: product.imageUrl,
                hasVariants: product.variants.length > 0,
              }}
            />
          </div>
          <ProductGallery alt={product.name} items={galleryItems} />
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          {product.category && (
            <Link
              href={sh(`?cat=${product.category.slug}`)}
              className="text-xs font-medium uppercase tracking-wide text-ink-3 hover:text-ink-2"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            {product.name}
          </h1>
          {reviewCount > 0 && (
            <a
              href="#resenas"
              className="mt-2 inline-flex items-center gap-1.5 hover:opacity-80"
            >
              <StarRating value={reviewAvg} count={reviewCount} size="md" />
            </a>
          )}
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <p className="text-3xl font-extrabold text-ink">
              {formatPrice(effectiveCents, store.currency)}
            </p>
            {onSale && (
              <>
                <p className="text-lg text-ink-3 line-through">
                  {formatPrice(product.priceCents, store.currency)}
                </p>
                <span className="rounded-full bg-bad px-2 py-0.5 text-sm font-semibold text-white">
                  -{pct}%
                </span>
              </>
            )}
          </div>

          {tracksStock(store.type) &&
            (() => {
              const hasVariants = product.variants.length > 0;
              const totalStock = hasVariants
                ? product.variants.reduce((n, v) => n + v.stock, 0)
                : product.stock;
              return (
                <div className="mt-4">
                  {totalStock > 0 ? (
                    <span className="text-sm text-ok-ink">
                      {hasVariants
                        ? "Disponible"
                        : `En stock (${totalStock} disponibles)`}
                    </span>
                  ) : (
                    <span className="text-sm text-bad-ink">Agotado</span>
                  )}
                </div>
              );
            })()}

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-ink-2">
              {product.description}
            </p>
          )}

          <AddToCart
            storeSlug={store.slug}
            currency={store.currency}
            disabled={tracksStock(store.type) && product.stock === 0}
            variants={product.variants.map((v) => ({
              id: v.id,
              color: v.color,
              size: v.size,
              stock: v.stock,
            }))}
            modifierGroups={parseModifiers(product.modifiersJson)}
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              priceCents: effectiveCents,
              imageUrl: product.imageUrl,
              alwaysAvailable: isMerchProduct(
                product.categoryId,
                store.merchCategoryIds,
              ),
            }}
          />

          <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            {openState.enforced && (
              <InfoRow icon={Clock} title={openState.isOpen ? "Abierto ahora" : "Cerrado ahora"}>
                {openState.isOpen ? "Puedes pedir ya." : (openState.message ?? "Vuelve en el horario de atención.")}
              </InfoRow>
            )}
            {payMethods.length > 0 && (
              <InfoRow icon={Wallet} title="Formas de pago">
                {payMethods.join(" · ")}
              </InfoRow>
            )}
            <InfoRow icon={Truck} title={shippingText}>
              {sedes > 1 ? `Te atendemos desde ${sedes} sedes; eliges la tuya al pagar.` : "Lo recibes en la dirección que indiques."}
            </InfoRow>
            <InfoRow icon={MessageCircle} title="Confirmación por WhatsApp">
              La tienda confirma tu pedido y te avisa cuando va en camino.
            </InfoRow>
          </ul>
        </div>
      </div>

      <section id="resenas" className="mt-16">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-ink">Reseñas</h2>
          {reviewCount > 0 && (
            <StarRating value={reviewAvg} count={reviewCount} size="md" />
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-2 p-8 text-center text-sm text-ink-3">
                Aún no hay reseñas. ¡Sé el primero en opinar!
              </p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-line pb-5 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">
                      {r.customerName}
                    </span>
                    <span className="text-xs text-ink-3">
                      {reviewDateFmt.format(r.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <StarRating value={r.rating} showCount={false} />
                  </div>
                  {r.comment && (
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-2">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="h-fit">
            <ReviewForm
              storeSlug={store.slug}
              productId={product.id}
              loggedIn={!!customer}
              existing={
                myReview
                  ? { rating: myReview.rating, comment: myReview.comment }
                  : null
              }
            />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-lg font-bold text-ink">
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                storeSlug={store.slug}
                currency={store.currency}
                freeShipping={store.shippingCents === 0}
                rating={{ avg: p.ratingAvg, count: p.ratingCount }}
                tracksStock={tracksStock(store.type)}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  priceCents: p.priceCents,
                  salePriceCents: p.salePriceCents,
                  imageUrl: p.imageUrl,
                  imagePosition: p.imagePosition,
                  imageZoom: p.imageZoom,
                  stock: p.stock,
                  alwaysAvailable: isMerchProduct(p.categoryId, store.merchCategoryIds),
                  hasModifiers: parseModifiers(p.modifiersJson).length > 0,
                  variants: p.variants,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-3">{children}</span>
      </span>
    </li>
  );
}
