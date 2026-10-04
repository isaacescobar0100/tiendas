"use client";

import type { StoreType } from "@prisma/client";
import { STORE_TYPE_OPTIONS } from "@/lib/store-type";
import { GRACE_DAYS } from "@/lib/billing";

export type StoreCfg = {
  id?: string;
  name: string;
  slug: string;
  type: StoreType;
  currency: string;
  customDomain: string | null;
  domainActive: boolean;
  seoCity: string | null;
  seoKeywords: string | null;
  plan: "SALE" | "RENT";
  paidUntil: string; // YYYY-MM-DD o ""
  maxLocations: number;
  sedesUsed: number;
  onlinePaymentEnabled: boolean;
  codEnabled: boolean;
  transferEnabled: boolean;
  wompiPublicKey: string | null;
  wompiPrivateKey: string | null;
  wompiIntegritySecret: string | null;
  wompiEventsSecret: string | null;
};

/** Valores de una tienda nueva (los mismos campos que al configurarla). */
export function newStoreDefaults(): StoreCfg {
  const inAYear = new Date(Date.now() + 365 * 86400000);
  return {
    name: "",
    slug: "",
    type: "FOOD",
    currency: "COP",
    customDomain: null,
    domainActive: false,
    seoCity: null,
    seoKeywords: null,
    plan: "SALE",
    paidUntil: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(inAYear),
    maxLocations: 1,
    sedesUsed: 0,
    onlinePaymentEnabled: false,
    codEnabled: true,
    transferEnabled: true,
    wompiPublicKey: null,
    wompiPrivateKey: null,
    wompiIntegritySecret: null,
    wompiEventsSecret: null,
  };
}

export const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";
export const labelCls = "mb-1 block text-sm font-medium text-gray-700";
const hintCls = "mt-1 text-xs text-gray-400";

/**
 * Configuración de una tienda: la MISMA al crearla y al editarla (datos,
 * dominio, SEO, métodos de pago, plan y sedes, llaves de Wompi). Así no hay
 * que crear la tienda y luego volver a configurarla.
 */
export function StoreConfigFields({ store, isNew }: { store: StoreCfg; isNew: boolean }) {
  return (
    <>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">Datos de la tienda</legend>
        <div>
          <label className={labelCls}>Nombre de la tienda</label>
          <input name="storeName" defaultValue={store.name} required placeholder="Sureños Club" className={inputCls} />
          {!isNew && <p className={hintCls}>Lo edita solo el superadmin (el admin no puede cambiarlo).</p>}
        </div>
        <div>
          <label className={labelCls}>Tipo de tienda</label>
          <select name="type" defaultValue={store.type} className={inputCls}>
            {STORE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
          <p className={hintCls}>Cambia qué se muestra: tallas y stock (moda), adiciones y horario (comida), o stock y +18 (licores).</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <div>
            <label className={labelCls}>URL corta (slug){isNew ? " — opcional" : ""}</label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-400">/</span>
              <input name="slug" defaultValue={store.slug} required={!isNew} placeholder={isNew ? "se crea con el nombre" : ""} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <input name="currency" defaultValue={store.currency} maxLength={3} disabled={!isNew} className={`${inputCls} uppercase disabled:bg-gray-50 disabled:text-gray-400`} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          {isNew
            ? "Si no escribes la URL corta, se arma con el nombre (sureños-club → surenos-club)."
            : "Cambiarla modifica el enlace actual (el anterior redirige al nuevo)."}
        </p>
      </fieldset>

      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">Dominio</legend>
        <div>
          <label className={labelCls}>Dominio propio (opcional)</label>
          <input name="customDomain" defaultValue={store.customDomain ?? ""} placeholder="surenosclub.com" className={inputCls} />
          <p className={hintCls}>
            Solo el dominio (sin https:// ni /ruta). Añádelo también en Vercel → Domains y apunta el DNS.
          </p>
        </div>
        {isNew ? (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Cuando el dominio ya funcione, actívalo desde «Configurar tienda»: el sistema lo comprueba y desde ahí lo usa
            como dirección principal (Google, enlaces y QR) y redirige el subdominio.
          </p>
        ) : (
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" name="domainActive" defaultChecked={store.domainActive} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            <span>
              El dominio ya funciona: usarlo como dirección principal
              <span className="block text-xs text-gray-400">
                Al guardar se comprueba que abra esta tienda. Desde ahí Google, los enlaces y los QR nuevos usan el dominio, y
                el subdominio redirige a él (los QR ya impresos siguen sirviendo).
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">Google (SEO)</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Ciudad principal</label>
            <input name="seoCity" defaultValue={store.seoCity ?? ""} placeholder="Barranquilla" maxLength={60} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lo que vende (opcional)</label>
            <input name="seoKeywords" defaultValue={store.seoKeywords ?? ""} placeholder="Hamburguesas, desgranados…" maxLength={300} className={inputCls} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          Arma los títulos para Google («Tienda | Hamburguesas en Barranquilla»). Si «lo que vende» queda vacío, se usan sus
          categorías. La tienda lo puede ajustar en SEO y Google.
        </p>
      </fieldset>

      <fieldset className="space-y-3 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">Métodos de pago (en la tienda)</legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="onlinePayment" defaultChecked={store.onlinePaymentEnabled} className="h-4 w-4 rounded border-gray-300" />
          Pago en línea (Wompi)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="codPayment" defaultChecked={store.codEnabled} className="h-4 w-4 rounded border-gray-300" />
          Contra entrega / coordinado (sin pasarela)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="transferPayment" defaultChecked={store.transferEnabled} className="h-4 w-4 rounded border-gray-300" />
          Transferencia / QR (Bre-B, Nequi, Daviplata, link)
        </label>
        <p className="text-xs text-gray-400">
          Debe quedar al menos uno activo. La tienda sube sus cuentas y QR para transferencia desde sus Ajustes.
        </p>
      </fieldset>

      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">Plan y sedes</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Tipo de cobro</label>
            <select name="plan" defaultValue={store.plan} className={inputCls}>
              <option value="SALE">Pago único + cuota anual</option>
              <option value="RENT">Mensual</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Sedes incluidas</label>
            <input type="number" name="maxLocations" min={1} max={50} defaultValue={store.maxLocations} className={inputCls} />
          </div>
        </div>
        {!isNew && (
          <p className="-mt-2 text-xs text-gray-400">
            Usa ahora {store.sedesUsed}. La tienda crea sus sedes sola hasta este tope; si lo bajas, las que existen se conservan.
          </p>
        )}
        <div>
          <label className={labelCls}>Pagada hasta</label>
          <input type="date" name="paidUntil" defaultValue={store.paidUntil} className={inputCls} />
          <p className={hintCls}>
            Anual: avisa 30 y 7 días antes. Mensual: 3 días antes. Al vencer hay {GRACE_DAYS} días de gracia y luego la tienda se
            suspende hasta renovar. Vacío = sin vencimiento.
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-gray-100 pt-6">
        <legend className="text-sm font-semibold text-gray-900">Pagos en línea (Wompi) de esta tienda</legend>
        <p className="-mt-2 text-xs text-gray-400">
          Cada tienda cobra a su propia cuenta de Wompi. Si lo dejas vacío, se usan las llaves de prueba del entorno.
        </p>
        {(
          [
            ["wompiPublicKey", "Llave pública", "pub_prod_...", store.wompiPublicKey],
            ["wompiPrivateKey", "Llave privada", "prv_prod_...", store.wompiPrivateKey],
            ["wompiIntegritySecret", "Secreto de integridad", "prod_integrity_...", store.wompiIntegritySecret],
            ["wompiEventsSecret", "Secreto de eventos (webhook)", "prod_events_...", store.wompiEventsSecret],
          ] as const
        ).map(([name, label, ph, value]) => (
          <div key={name}>
            <label className={labelCls}>{label}</label>
            <input name={name} defaultValue={value ?? ""} placeholder={ph} className={inputCls} autoComplete="off" />
          </div>
        ))}
      </fieldset>
    </>
  );
}
