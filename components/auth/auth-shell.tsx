import {
  BellRing,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  Palette,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Store,
  Timer,
  Wallet,
} from "lucide-react";
import { storeForHost } from "@/lib/host-store";
import { DEFAULT_THEME, storeTheme, themeStyle } from "@/lib/theme";
import { themeFontVars } from "@/lib/fonts";
import { parseStorePhoto } from "@/lib/store-photos";
import { StorePhotoImg } from "@/components/store-photo";

export type AuthVariant = "admin" | "sede" | "recover" | "reset";

type Feature = { icon: React.ElementType; title: string; text: string };

// Textos del panel informativo según la pantalla y si hay tienda o no.
function copy(variant: AuthVariant, storeName: string | null) {
  const brand = storeName ?? "MiTienda";
  switch (variant) {
    case "sede":
      return {
        eyebrow: "Panel de sede",
        title: storeName ? `Atiende los pedidos de tu sede de ${storeName}` : "Atiende los pedidos de tu sede",
        features: [
          { icon: ClipboardList, title: "Solo tus pedidos", text: "Cada sede ve y gestiona únicamente lo suyo." },
          { icon: MessageCircle, title: "Confirma en un toque", text: "Avisa al cliente por WhatsApp con el mensaje listo." },
          { icon: Wallet, title: "Pagos y entregas", text: "Marca pagado, en camino y entregado." },
        ] as Feature[],
      };
    case "recover":
    case "reset":
      return {
        eyebrow: "Acceso seguro",
        title: variant === "recover" ? "Recupera el acceso a tu panel" : "Crea una contraseña nueva",
        features: [
          { icon: KeyRound, title: "Enlace de un solo uso", text: "Llega a tu correo y solo sirve una vez." },
          { icon: Timer, title: "Vence pronto", text: "Si no lo usas a tiempo, pide otro." },
          { icon: ShieldCheck, title: "Sesiones cerradas", text: "Al cambiarla se cierran las sesiones abiertas." },
        ] as Feature[],
      };
    default:
      return storeName
        ? {
            eyebrow: "Panel de administración",
            title: `Gestiona ${brand} desde un solo lugar`,
            features: [
              { icon: BellRing, title: "Pedidos al instante", text: "Los de todas tus sedes, con su estado y pago." },
              { icon: MessageCircle, title: "Confirma por WhatsApp", text: "El mensaje se arma solo, antes o después del comprobante." },
              { icon: Palette, title: "Tu marca", text: "Productos, menú QR, colores y tipografía." },
            ] as Feature[],
          }
        : {
            eyebrow: "Plataforma de tiendas",
            title: "Vende online con tu marca, sin comisiones por pedido",
            features: [
              { icon: ShoppingBag, title: "Tienda y menú QR", text: "Catálogo, carrito y carta digital para las mesas." },
              { icon: LayoutDashboard, title: "Varias sedes", text: "Cada sede con su acceso y sus pedidos." },
              { icon: QrCode, title: "Pagos directos", text: "Transferencia, QR, Nequi o Wompi: el dinero llega a tu cuenta." },
            ] as Feature[],
          };
  }
}

/**
 * Pantalla de acceso en dos columnas: a la izquierda un panel informativo con
 * la marca; a la derecha el formulario. Si se abre desde la dirección de una
 * tienda, usa su logo, su portada y su tema (Apariencia).
 */
export async function AuthShell({
  variant,
  children,
}: {
  variant: AuthVariant;
  children: React.ReactNode;
}) {
  const store = await storeForHost();
  const theme = store ? storeTheme(store) : DEFAULT_THEME;
  const c = copy(variant, store?.name ?? null);
  const name = store?.name ?? "MiTienda";
  // Foto de fondo del acceso (Apariencia > Fotos de fondo). Con foto, toda la
  // pantalla la lleva de fondo con una capa oscura; el texto del panel va en
  // blanco y el formulario en una tarjeta translúcida, así siempre se lee.
  const bg = store ? parseStorePhoto(store.loginBgJson) : null;
  const panelText = bg ? "text-white" : "text-brand-ink";
  const chip = bg ? "bg-white/15 ring-1 ring-white/25" : "bg-brand-ink/15 ring-1 ring-brand-ink/20";

  return (
    <div
      className={`store-theme ${themeFontVars} relative grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]`}
      style={themeStyle(theme)}
    >
      {bg && (
        <div className="pointer-events-none fixed inset-0" aria-hidden>
          <StorePhotoImg photo={bg} alt="" eager className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/60 to-black/45" />
        </div>
      )}

      {/* ── Panel informativo (escritorio) ── */}
      <aside
        className={`relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 ${bg ? "" : "bg-brand"} ${panelText}`}
      >
        {!bg && (
          <>
            {/* Manchas de luz decorativas (sin texto encima: no afectan el contraste) */}
            <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-ink/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand-ink/10 blur-3xl" />
          </>
        )}

        <div className="relative flex items-center gap-3">
          <Logo logoUrl={store?.logoUrl ?? null} isStore={!!store} />
          <span className="text-lg font-bold tracking-tight">{name}</span>
        </div>

        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">{c.eyebrow}</p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">{c.title}</h2>
          {store?.description && variant === "admin" && (
            <p className="mt-4 text-base leading-relaxed">{store.description}</p>
          )}
          <ul className="mt-10 space-y-5">
            {c.features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl backdrop-blur ${chip}`}>
                  <f.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm leading-relaxed">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs font-medium">
          {store ? `${store.name} · con tecnología de MiTienda` : "MiTienda · tiendas online para negocios"}
        </p>
      </aside>

      {/* ── Formulario ── */}
      <main className={`relative flex flex-col px-6 py-10 sm:px-10 ${bg ? "" : "bg-bg"}`}>
        {/* Celular: marca arriba (el panel informativo no cabe) */}
        <div className={`mb-10 flex items-center gap-3 lg:hidden ${bg ? "text-white" : ""}`}>
          <span className="flex rounded-2xl bg-brand p-0.5 text-brand-ink">
            <Logo logoUrl={store?.logoUrl ?? null} isStore={!!store} />
          </span>
          <span>
            <span className={`block font-bold ${bg ? "" : "text-ink"}`}>{name}</span>
            <span className={`block text-xs ${bg ? "" : "text-ink-3"}`}>{c.eyebrow}</span>
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {bg ? (
            <div className="rounded-3xl bg-bg/90 p-7 shadow-2xl ring-1 ring-line backdrop-blur-xl sm:p-9">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
        <p className={`mt-10 text-center text-xs lg:hidden ${bg ? "text-white" : "text-ink-3"}`}>
          {store ? `${store.name} · con tecnología de MiTienda` : "MiTienda"}
        </p>
      </main>
    </div>
  );
}

function Logo({ logoUrl, isStore }: { logoUrl: string | null; isStore: boolean }) {
  const cls = "h-10 w-10 rounded-xl";
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className={`${cls} bg-surface object-cover shadow-lg`} />
  ) : (
    <span className={`${cls} flex items-center justify-center bg-brand-ink/15 shadow-lg`}>
      {isStore ? <Store className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
    </span>
  );
}
