import type { Promotion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminStore } from "@/lib/guards";
import { ImageUpload } from "@/components/image-upload";
import {
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
  type PromoState,
} from "./actions";
import { PromoFormShell } from "./promo-form-shell";
import { VideoField } from "@/components/video-field";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-line-2 px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const labelCls = "mb-1 block text-sm font-medium text-ink-2";

type LinkOption = { value: string; label: string };

export default async function PromotionsPage() {
  const { store } = await requireAdminStore();
  const [promotions, categories, products] = await Promise.all([
    prisma.promotion.findMany({
      where: { storeId: store.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.findMany({
      where: { storeId: store.id, active: true },
      orderBy: { createdAt: "desc" },
      select: { name: true, slug: true },
    }),
  ]);

  // Opciones del desplegable de enlace (para no copiar URLs a mano).
  const specialLinks: LinkOption[] = [
    { value: `/${store.slug}?offers=1`, label: "Página de ofertas" },
    { value: `/${store.slug}`, label: "Inicio de la tienda" },
  ];
  const categoryLinks: LinkOption[] = categories.map((c) => ({
    value: `/${store.slug}?cat=${c.slug}`,
    label: c.name,
  }));
  const productLinks: LinkOption[] = products.map((p) => ({
    value: `/${store.slug}/${p.slug}`,
    label: p.name,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Promociones (banner)</h1>
        <p className="text-sm text-ink-3">
          Cada promoción es una diapositiva del banner de tu tienda. Si hay más
          de una activa, el banner rota entre ellas. Si no hay ninguna, se
          muestra tu banner con el nombre de la tienda.
        </p>
      </div>

      {/* Nueva promoción */}
      <PromotionForm
        action={createPromotionAction}
        resetOnSuccess
        submitLabel="Añadir promoción"
        title="Nueva promoción"
        specialLinks={specialLinks}
        categoryLinks={categoryLinks}
        productLinks={productLinks}
        categories={categories}
      />

      {/* Existentes */}
      {promotions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">
            Promociones creadas ({promotions.length})
          </h2>
          {promotions.map((p) => (
            <PromotionForm
              key={p.id}
              action={updatePromotionAction}
              promotion={p}
              submitLabel="Guardar cambios"
              specialLinks={specialLinks}
              categoryLinks={categoryLinks}
              productLinks={productLinks}
              categories={categories}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromotionForm({
  action,
  resetOnSuccess = false,
  promotion,
  submitLabel,
  title,
  specialLinks,
  categoryLinks,
  productLinks,
  categories,
}: {
  action: (prev: PromoState, formData: FormData) => Promise<PromoState>;
  resetOnSuccess?: boolean;
  promotion?: Promotion;
  submitLabel: string;
  title?: string;
  specialLinks: LinkOption[];
  categoryLinks: LinkOption[];
  productLinks: LinkOption[];
  categories: { id: string; name: string }[];
}) {
  // Si la promoción ya tiene un enlace que no está entre las opciones
  // (p. ej. una URL externa antigua), lo mantenemos como opción extra.
  const known = new Set([
    ...specialLinks,
    ...categoryLinks,
    ...productLinks,
  ].map((o) => o.value));
  const current = promotion?.linkUrl ?? "";
  const customLink = current && !known.has(current) ? current : "";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      {title && (
        <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      )}
      <PromoFormShell action={action} submitLabel={submitLabel} resetOnSuccess={resetOnSuccess}>
        {promotion && <input type="hidden" name="id" value={promotion.id} />}

        <ImageUpload
          name="imageUrl"
          label="Imagen de la promoción"
          defaultUrl={promotion?.imageUrl ?? undefined}
          aspect="wide"
          reposition
          positionName="imagePosition"
          defaultPosition={promotion?.imagePosition ?? "50% 50%"}
          zoomName="imageZoom"
          defaultZoom={promotion?.imageZoom ?? 1}
        />

        <div>
          <label className={labelCls}>Video de la diapositiva (opcional)</label>
          <p className="mb-2 text-xs text-ink-3">
            Si pones un video, la diapositiva lo muestra en lugar de la imagen (con botón de sonido).
          </p>
          <VideoField name="videoUrl" defaultUrl={promotion?.videoUrl ?? null} />
        </div>

        <div>
          <label className={labelCls}>Título</label>
          <input
            name="title"
            defaultValue={promotion?.title ?? ""}
            placeholder="Ej: 50% en zapatillas"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Subtítulo</label>
          <input
            name="subtitle"
            defaultValue={promotion?.subtitle ?? ""}
            placeholder="Ej: Solo esta semana"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Al hacer clic, ir a… (opcional)</label>
          <select
            name="linkUrl"
            defaultValue={current}
            className={inputCls}
          >
            <option value="">Sin enlace</option>
            {customLink && (
              <option value={customLink}>Enlace actual: {customLink}</option>
            )}
            <optgroup label="Páginas">
              {specialLinks.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            {categoryLinks.length > 0 && (
              <optgroup label="Categorías">
                {categoryLinks.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
            {productLinks.length > 0 && (
              <optgroup label="Productos">
                {productLinks.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="mt-1 text-xs text-ink-3">
            Elige a dónde lleva la promoción: la página de ofertas, una categoría
            o un producto. No necesitas copiar ninguna dirección.
          </p>
        </div>

        {/* Destinos: dónde se muestra esta promoción */}
        <div className="rounded-lg border border-line p-4">
          <p className="mb-2 text-sm font-medium text-ink-2">
            ¿Dónde se muestra?
          </p>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="showOnBanner"
              defaultChecked={promotion ? promotion.showOnBanner : true}
              className="h-4 w-4 rounded border-line-2"
            />
            En el banner de inicio
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="showOnOffers"
              defaultChecked={promotion ? promotion.showOnOffers : false}
              className="h-4 w-4 rounded border-line-2"
            />
            En la página de Ofertas
          </label>
          <div className="mt-3">
            <label className="mb-1 block text-sm text-ink-2">
              En una categoría (opcional)
            </label>
            <select
              name="categoryId"
              defaultValue={promotion?.categoryId ?? ""}
              className={inputCls}
            >
              <option value="">Ninguna</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="w-28">
            <label className={labelCls}>Orden</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={promotion?.sortOrder ?? 0}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={promotion ? promotion.active : true}
              className="h-4 w-4 rounded border-line-2"
            />
            Activa (visible en la tienda)
          </label>
        </div>

      </PromoFormShell>

      {promotion && (
        <form action={deletePromotionAction} className="mt-3">
          <input type="hidden" name="id" value={promotion.id} />
          <button className="rounded-md border border-bad/30 px-3 py-1.5 text-xs text-bad-ink hover:bg-bad-soft">
            Borrar promoción
          </button>
        </form>
      )}
    </div>
  );
}
