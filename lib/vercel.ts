// Conexión con la API de Vercel para agregar los dominios de cada tienda al
// proyecto automáticamente (lo mismo que hacer Vercel → Domains → Add a mano).
//
// Variables (en Vercel → Settings → Environment Variables):
//   VERCEL_API_TOKEN   token personal (Account Settings → Tokens), solo servidor
//   VERCEL_PROJECT_ID  id del proyecto "tiendas" (Settings → General → Project ID)
//   VERCEL_TEAM_ID     opcional: id del equipo, si el proyecto está en un equipo
//
// Sin token, todo sigue funcionando: solo hay que agregar los dominios a mano.
import "server-only";

const API = "https://api.vercel.com";

function cfg() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const project = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !project) return null;
  return { token, project, team: process.env.VERCEL_TEAM_ID?.trim() || null };
}

export const vercelEnabled = () => cfg() !== null;

async function call(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const c = cfg();
  if (!c) return { ok: false, status: 0, data: {} };
  const url = new URL(API + path);
  if (c.team) url.searchParams.set("teamId", c.team);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export type DomainResult = { ok: boolean; message?: string };

/** ¿El dominio ya está en el proyecto? */
async function inProject(domain: string): Promise<boolean> {
  const c = cfg();
  if (!c) return false;
  const r = await call(`/v9/projects/${encodeURIComponent(c.project)}/domains/${encodeURIComponent(domain)}`);
  return r.ok;
}

/** Agrega el dominio al proyecto (si ya estaba, no hace nada). */
export async function addProjectDomain(domain: string): Promise<DomainResult> {
  const c = cfg();
  if (!c) return { ok: false, message: "La conexión con Vercel no está configurada (VERCEL_API_TOKEN / VERCEL_PROJECT_ID)." };
  if (await inProject(domain)) return { ok: true };
  const r = await call(`/v10/projects/${encodeURIComponent(c.project)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (r.ok) return { ok: true };
  const err = (r.data.error ?? {}) as { code?: string; message?: string };
  if (err.code === "domain_already_in_use") {
    return { ok: false, message: `${domain} ya está en otro proyecto de Vercel.` };
  }
  return { ok: false, message: err.message || `Vercel respondió ${r.status || "sin conexión"}.` };
}

/** Quita el dominio del proyecto (al borrar la tienda o cambiar de dominio). */
export async function removeProjectDomain(domain: string): Promise<void> {
  const c = cfg();
  if (!c) return;
  await call(`/v9/projects/${encodeURIComponent(c.project)}/domains/${encodeURIComponent(domain)}`, { method: "DELETE" });
}

export type DomainStatus = {
  inProject: boolean;
  dnsOk: boolean; // el DNS ya apunta a Vercel
  records: { type: "A" | "CNAME"; name: string; value: string }[]; // lo que hay que configurar
};

/** Estado de un dominio: si está en el proyecto y si su DNS ya apunta bien. */
export async function domainStatus(domain: string): Promise<DomainStatus | null> {
  if (!cfg()) return null;
  const [inside, conf] = await Promise.all([inProject(domain), call(`/v6/domains/${encodeURIComponent(domain)}/config`)]);
  const apex = domain.split(".").length === 2;
  const ipv4 = (conf.data.recommendedIPv4 as { value?: string[] }[] | undefined)?.[0]?.value?.[0] ?? "76.76.21.21";
  const cname = ((conf.data.recommendedCNAME as { value?: string }[] | undefined)?.[0]?.value ?? "cname.vercel-dns.com").replace(/\.$/, "");
  return {
    inProject: inside,
    dnsOk: conf.ok && conf.data.misconfigured === false,
    records: apex
      ? [{ type: "A", name: "@", value: ipv4 }]
      : [{ type: "CNAME", name: domain.split(".")[0], value: cname }],
  };
}
