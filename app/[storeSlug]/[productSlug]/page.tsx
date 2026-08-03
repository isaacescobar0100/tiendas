import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { isMerchProduct } from "@/lib/store-hours";
import { parseModifiers } from "@/lib/modifiers";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isOnSale, effectivePriceCents, discountPercent } from "@/lib/pricing";
import { AddToCart } from "@/components/cart/add-to-cart";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";

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
  const data = await getData(storeSlug, productSlug);
  if (!data) notFound();
  const { store, product } = data;

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
  const related = relatedRaw
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
  const reviewDateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium" });

  return (
    <div>
      <Link
        href={`/${store.slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
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

        <div>
          {product.category && (
            <Link
              href={`/${store.slug}?cat=${product.category.slug}`}
              className="text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
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
            <p className="text-2xl font-semibold text-gray-900">
              {formatPrice(effectiveCents, store.currency)}
            </p>
            {onSale && (
              <>
                <p className="text-lg text-gray-400 line-through">
                  {formatPrice(product.priceCents, store.currency)}
                </p>
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-sm font-semibold text-white">
                  -{pct}%
                </span>
              </>
            )}
          </div>

          {(() => {
            const hasVariants = product.variants.length > 0;
            const totalStock = hasVariants
              ? product.variants.reduce((n, v) => n + v.stock, 0)
              : product.stock;
            return (
              <div className="mt-4">
                {totalStock > 0 ? (
                  <span className="text-sm text-green-600">
                    {hasVariants ? "Disponible" : `En stock (${totalStock} disponibles)`}
                  </span>
                ) : (
                  <span className="text-sm text-red-500">Agotado</span>
                )}
              </div>
            );
          })()}

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-gray-600">
              {product.description}
            </p>
          )}

          <AddToCart
            storeSlug={store.slug}
            currency={store.currency}
            disabled={product.stock === 0}
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
        </div>
      </div>

      <section id="resenas" className="mt-16">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Reseñas</h2>
          {reviewCount > 0 && (
            <StarRating value={reviewAvg} count={reviewCount} size="md" />
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                Aún no hay reseñas. ¡Sé el primero en opinar!
              </p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-gray-100 pb-5 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {r.customerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {reviewDateFmt.format(r.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <StarRating value={r.rating} showCount={false} />
                  </div>
                  {r.comment && (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
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
          <h2 className="mb-6 text-lg font-bold text-gray-900">
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
