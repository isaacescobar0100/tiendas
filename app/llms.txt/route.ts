import { prisma } from "@/lib/prisma";
import { storeForHost } from "@/lib/host-store";
import { storeUrl, sedeSlug, seoHomeDescription, seoTagline, phoneE164 } from "@/lib/seo";
import { aboutIsLive, parseAbout } from "@/lib/about";
import { parseStoreHours, DAY_ORDER } from "@/lib/store-hours";
import { parseTransferAccounts, TRANSFER_KIND_LABEL } from "@/lib/payment-methods";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * llms.txt — resumen en texto claro de la tienda para los buscadores con IA
 * (ChatGPT, Claude, Perplexity, Gemini): quiénes son, sedes, horario, cómo
 * pedir, cómo pagar, el menú con precios y preguntas frecuentes. Cada tienda
 * lo publica en su propia dirección (/llms.txt).
 */
export async function GET() {
  const host = await storeForHost();
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" };
  if (!host) {
    return new Response("# MiTienda\n\n> Plataforma para crear tiendas en línea con marca propia.\n", { headers });
  }

  const store = await prisma.store.findUnique({
    where: { id: host.id },
    select: {
      onlinePaymentEnabled: true,
      codEnabled: true,
      transferEnabled: true,
      transferAccountsJson: true,
      shippingCents: true,
      freeShippingOverCents: true,
      whatsapp: true,
      locations: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { name: true, address: true, whatsapp: true } },
      categories: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      products: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { name: true, slug: true, description: true, priceCents: true, salePriceCents: true, categoryId: true },
      },
    },
  });
  if (!store) return new Response("", { status: 404 });

  const u = (p = "") => storeUrl(host, p);
  const money = (c: number) => formatPrice(c, host.currency);
  const L: string[] = [];
  L.push(`# ${host.name}`, "", `> ${seoHomeDescription(host)}`, "");
  L.push(`- Qué es: ${seoTagline(host)}.`);
  L.push(`- Sitio web y pedidos en línea: ${u()}`);
  if (host.type === "FOOD") L.push(`- Menú: ${u("/menu")}`);
  const about = parseAbout(host.aboutJson);
  if (aboutIsLive(about)) L.push(`- Quiénes somos: ${u("/nosotros")}`);
  L.push("");

  if (store.locations.length) {
    L.push("## Sedes", "");
    for (const l of store.locations) {
      const tel = phoneE164(l.whatsapp);
      L.push(`- **${l.name}**${l.address ? ` — ${l.address}` : ""}${tel ? ` · WhatsApp ${tel}` : ""} · ${u(`/sedes/${sedeSlug(l.name)}`)}`);
    }
    L.push("");
  }

  const hours = parseStoreHours(host.hoursJson);
  if (hours?.enabled) {
    L.push("## Horario", "");
    for (const { idx, label } of DAY_ORDER) {
      const d = hours.days[idx];
      L.push(`- ${label}: ${d.closed || !d.open || !d.close ? "cerrado" : `${d.open} a ${d.close}`}`);
    }
    L.push("");
  }

  L.push("## Cómo pedir", "");
  L.push(`- En línea en ${u()}: se eligen los productos (con adiciones y notas como «sin cebolla»)${store.locations.length ? ", la sede" : ""} y la forma de pago.`);
  const pay: string[] = [];
  if (store.transferEnabled) {
    const kinds = [...new Set(parseTransferAccounts(store.transferAccountsJson).map((a) => TRANSFER_KIND_LABEL[a.kind] ?? a.kind))];
    pay.push(`transferencia${kinds.length ? ` (${kinds.join(", ")})` : ""}`);
  }
  if (store.codEnabled) pay.push("pago contra entrega");
  if (store.onlinePaymentEnabled) pay.push("pago en línea con tarjeta o PSE");
  if (pay.length) L.push(`- Formas de pago: ${pay.join(", ")}.`);
  if (store.shippingCents > 0) {
    L.push(`- Domicilio: ${money(store.shippingCents)}${store.freeShippingOverCents > 0 ? ` (gratis desde ${money(store.freeShippingOverCents)})` : ""}.`);
  }
  if (host.type === "FOOD") L.push(`- En el local: cada mesa tiene un código QR con el menú.`);
  L.push("");

  if (store.products.length) {
    L.push(host.type === "FOOD" ? "## Menú" : "## Productos", "");
    const known = new Set(store.categories.map((c) => c.id));
    const groups = [
      ...store.categories.map((c) => ({ name: c.name, items: store.products.filter((p) => p.categoryId === c.id) })),
      { name: "Otros", items: store.products.filter((p) => !p.categoryId || !known.has(p.categoryId)) },
    ].filter((g) => g.items.length);
    for (const g of groups) {
      L.push(`### ${g.name}`, "");
      for (const p of g.items) {
        const sale = p.salePriceCents && p.salePriceCents > 0 && p.salePriceCents < p.priceCents;
        const price = sale ? `${money(p.salePriceCents!)} (antes ${money(p.priceCents)})` : money(p.priceCents);
        L.push(`- [${p.name}](${u(`/${p.slug}`)}) — ${price}${p.description ? `: ${p.description}` : ""}`);
      }
      L.push("");
    }
  }

  if (about.faqs.length) {
    L.push("## Preguntas frecuentes", "");
    for (const f of about.faqs) L.push(`**${f.q}**`, f.a, "");
  }

  L.push("## Más información", "", `- Mapa del sitio: ${u("/sitemap.xml")}`);
  return new Response(L.join("\n"), { headers });
}
