"use client";

import { useActionState, useState } from "react";
import { Armchair, Check, Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { keepFormSubmit } from "@/components/keep-form";
import {
  addTableAction,
  createTablesAction,
  deleteTableAction,
  renameTableAction,
  type TableState,
} from "./actions";

type Loc = { id: string; name: string };
type Table = { id: string; name: string; locationId: string | null };

const inputCls =
  "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover disabled:opacity-60";

/** Mesas con QR propio: crear varias, agregar una, renombrar, imprimir, borrar. */
export function TablesManager({ locations, tables }: { locations: Loc[]; tables: Table[] }) {
  // Grupos por sede (y "Sin sede" si hay mesas sin sede o la tienda no tiene sedes).
  const groups = [
    ...locations.map((l) => ({ key: l.id, title: l.name, items: tables.filter((t) => t.locationId === l.id) })),
    { key: "none", title: locations.length ? "Sin sede" : "Mesas", items: tables.filter((t) => !t.locationId) },
  ].filter((g) => g.items.length > 0);

  return (
    <section className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6 print:hidden">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Armchair className="h-5 w-5" /> QR por mesa
        </h2>
        <p className="mt-0.5 text-sm text-ink-3">
          Cada mesa tiene su propio QR: al escanearlo, el menú muestra el nombre de la mesa y su sede. Si
          cambias el nombre de una mesa no hay que reimprimir su QR.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <BatchForm locations={locations} />
        <SingleForm locations={locations} />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">
          Aún no hay mesas. Crea las de cada sede arriba (por ejemplo, Mesa 1 a Mesa 10).
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="space-y-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">
                {g.title} <span className="text-sm font-normal text-ink-3">· {g.items.length} {g.items.length === 1 ? "mesa" : "mesas"}</span>
              </h3>
              <a
                href={`/admin/menu-qr/imprimir?sede=${g.key}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
              >
                <Printer className="h-4 w-4" /> Imprimir todas
              </a>
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((t) => (
                <TableRow key={t.id} table={t} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function Msg({ state }: { state: TableState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-ink">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-ink">
        <Check className="h-4 w-4" /> {state.ok}
      </p>
    );
  return null;
}

function LocationSelect({ locations }: { locations: Loc[] }) {
  if (locations.length === 0) return <input type="hidden" name="locationId" value="" />;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-2">Sede</span>
      <select name="locationId" defaultValue={locations[0].id} className={inputCls}>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function BatchForm({ locations }: { locations: Loc[] }) {
  const [state, action, pending] = useActionState<TableState, FormData>(createTablesAction, undefined);
  return (
    <form onSubmit={keepFormSubmit(action)} className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-sm font-semibold text-ink">Crear varias mesas</p>
      <LocationSelect locations={locations} />
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-2">Nombre</span>
          <input name="prefix" defaultValue="Mesa" maxLength={30} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-2">Desde</span>
          <input name="from" type="number" min={0} defaultValue={1} required className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-2">Hasta</span>
          <input name="to" type="number" min={0} defaultValue={10} required className={inputCls} />
        </label>
      </div>
      <Msg state={state} />
      <button type="submit" disabled={pending} className={btnCls}>
        <Plus className="h-4 w-4" /> {pending ? "Creando…" : "Crear mesas"}
      </button>
    </form>
  );
}

function SingleForm({ locations }: { locations: Loc[] }) {
  const [state, action, pending] = useActionState<TableState, FormData>(addTableAction, undefined);
  return (
    <form onSubmit={keepFormSubmit(action)} className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-sm font-semibold text-ink">Una mesa con otro nombre</p>
      <LocationSelect locations={locations} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-2">Nombre de la mesa</span>
        <input name="name" maxLength={40} required placeholder="Barra, Terraza 2, VIP…" className={inputCls} />
      </label>
      <Msg state={state} />
      <button type="submit" disabled={pending} className={btnCls}>
        <Plus className="h-4 w-4" /> {pending ? "Agregando…" : "Agregar mesa"}
      </button>
    </form>
  );
}

function TableRow({ table }: { table: Table }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<TableState, FormData>(async (prev, fd) => {
    const r = await renameTableAction(prev, fd);
    if (r?.ok) setEditing(false);
    return r;
  }, undefined);
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-line-2 text-ink-2 transition hover:bg-surface-2";

  return (
    <li className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
      {editing ? (
        <form onSubmit={keepFormSubmit(action)} className="flex gap-2">
          <input type="hidden" name="id" value={table.id} />
          <input
            name="name"
            defaultValue={table.name}
            maxLength={40}
            autoFocus
            aria-label="Nuevo nombre"
            className={`${inputCls} py-1.5`}
          />
          <button type="submit" disabled={pending} className={`${btnCls} px-3 py-1.5`}>
            Guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink-3 hover:text-ink">
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-ink">{table.name}</span>
          <div className="flex shrink-0 gap-1">
            <a
              href={`/admin/menu-qr/imprimir?mesa=${table.id}`}
              target="_blank"
              rel="noopener"
              title="Imprimir"
              aria-label={`Imprimir QR de ${table.name}`}
              className={iconBtn}
            >
              <Printer className="h-4 w-4" />
            </a>
            <a
              href={`/admin/menu-qr/qr?mesa=${table.id}`}
              title="Descargar PNG"
              aria-label={`Descargar QR de ${table.name}`}
              className={iconBtn}
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Cambiar nombre"
              aria-label={`Cambiar nombre de ${table.name}`}
              className={iconBtn}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <form
              action={deleteTableAction}
              onSubmit={(e) => {
                if (!confirm(`¿Eliminar «${table.name}»? Su QR impreso dejará de mostrar el nombre de la mesa.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={table.id} />
              <button
                type="submit"
                title="Eliminar"
                aria-label={`Eliminar ${table.name}`}
                className={`${iconBtn} text-bad-ink hover:bg-bad-soft`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
      {state?.error && <p className="mt-1 text-xs text-bad-ink">{state.error}</p>}
    </li>
  );
}
