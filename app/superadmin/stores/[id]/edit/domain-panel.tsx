import { CheckCircle2, CircleAlert, Globe2, RefreshCw } from "lucide-react";
import { domainStatus, vercelEnabled, type DomainStatus } from "@/lib/vercel";
import { connectStoreDomainsAction } from "../../../actions";

// Estado de los dominios de la tienda en Vercel: si están en el proyecto y si
// el DNS ya apunta bien (con los registros a configurar si falta).
export async function DomainPanel({ storeId, slug, customDomain }: { storeId: string; slug: string; customDomain: string | null }) {
  const root = (process.env.STORE_ROOT_DOMAIN ?? "").trim().toLowerCase();
  const sub = root ? `${slug}.${root}` : null;

  if (!vercelEnabled()) {
    return (
      <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-semibold">
          <CircleAlert className="h-4 w-4" /> Conexión automática con Vercel sin configurar
        </p>
        <p>Mientras tanto, agrega a mano en Vercel → tiendas → Domains: {[sub, customDomain].filter(Boolean).join(" y ") || "el dominio de la tienda"}.</p>
        <p className="text-xs">
          Para que sea automático, agrega en Vercel → Settings → Environment Variables: <code>VERCEL_API_TOKEN</code> (Account
          Settings → Tokens), <code>VERCEL_PROJECT_ID</code> (Settings → General → Project ID) y, si el proyecto está en un
          equipo, <code>VERCEL_TEAM_ID</code>. Luego vuelve a desplegar.
        </p>
      </section>
    );
  }

  const domains = [sub, customDomain].filter(Boolean) as string[];
  const statuses = await Promise.all(domains.map((d) => domainStatus(d)));
  const anyMissing = statuses.some((s) => s && !s.inProject);

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Globe2 className="h-4 w-4" /> Conexión con Vercel
      </h2>
      {domains.length === 0 && <p className="text-sm text-gray-500">Esta tienda no tiene dominios para conectar.</p>}
      {domains.map((d, i) => (
        <DomainRow key={d} domain={d} status={statuses[i]} own={d === customDomain} />
      ))}
      {anyMissing && (
        <form action={connectStoreDomainsAction}>
          <input type="hidden" name="storeId" value={storeId} />
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <RefreshCw className="h-4 w-4" /> Conectar ahora
          </button>
        </form>
      )}
    </section>
  );
}

function DomainRow({ domain, status, own }: { domain: string; status: DomainStatus | null; own: boolean }) {
  const okBadge = "inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700";
  const warnBadge = "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700";
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-gray-900">{domain}</span>
        {status?.inProject ? (
          <span className={okBadge}><CheckCircle2 className="h-3.5 w-3.5" /> En Vercel</span>
        ) : (
          <span className={warnBadge}><CircleAlert className="h-3.5 w-3.5" /> Sin conectar</span>
        )}
        {status?.inProject &&
          (status.dnsOk ? (
            <span className={okBadge}><CheckCircle2 className="h-3.5 w-3.5" /> DNS listo</span>
          ) : (
            <span className={warnBadge}><CircleAlert className="h-3.5 w-3.5" /> Falta el DNS</span>
          ))}
      </div>
      {own && status?.inProject && !status.dnsOk && (
        <div className="mt-2 text-xs text-gray-600">
          <p>En el proveedor del dominio (GoDaddy, Hostinger…) crea este registro:</p>
          <table className="mt-1 w-full text-left">
            <thead className="text-gray-400">
              <tr><th className="pr-3 font-medium">Tipo</th><th className="pr-3 font-medium">Nombre</th><th className="font-medium">Valor</th></tr>
            </thead>
            <tbody className="font-mono text-gray-900">
              {status.records.map((r) => (
                <tr key={r.type + r.name}><td className="pr-3">{r.type}</td><td className="pr-3">{r.name}</td><td>{r.value}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1">Cuando el DNS quede listo, activa «El dominio ya funciona» en el formulario.</p>
        </div>
      )}
    </div>
  );
}
