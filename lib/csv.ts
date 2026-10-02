// Utilidades para los exportes CSV (admin, sede, superadmin).

// Escapa un campo para CSV (delimitador ';', comillas dobladas) y neutraliza
// fórmulas: un valor que empieza por = + - @ (o tabulador / retorno) se prefija
// con un apóstrofo para que Excel/Sheets lo muestren como texto y no lo
// ejecuten. Los datos del cliente (nombre, dirección, teléfono…) los escribe
// cualquiera desde el checkout.
export function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? "");
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Respuesta de descarga CSV (con BOM para acentos en Excel) que no se cachea. */
export function csvResponse(lines: string[], filename: string): Response {
  const safeName = filename.replace(/[^A-Za-z0-9._-]+/g, "-");
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
