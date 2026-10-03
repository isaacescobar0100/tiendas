"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
    >
      <Printer className="h-4 w-4" /> Imprimir
    </button>
  );
}
