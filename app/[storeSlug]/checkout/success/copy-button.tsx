"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copia un texto (llave, número…) al portapapeles para pegarlo en la app del banco.
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el texto sigue visible para copiarlo a mano.
        }
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line-2 bg-surface px-2 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-ok-ink" /> Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copiar
        </>
      )}
    </button>
  );
}
