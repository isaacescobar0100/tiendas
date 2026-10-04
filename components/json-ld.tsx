// Datos estructurados (schema.org) para Google y los buscadores con IA.
// Se escapa "<" para que ningún texto de la tienda pueda cerrar el <script>.
export function JsonLd({ data }: { data: object | null | undefined }) {
  if (!data) return null;
  const json = JSON.stringify(data, (_k, v) => (v === undefined || v === null || v === "" ? undefined : v)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
