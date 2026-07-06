"use client";

import { useRef } from "react";
import { Move, ZoomIn, ZoomOut } from "lucide-react";

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const clampZoom = (n: number) => Math.max(1, Math.min(3, n));
function parsePos(p: string): { x: number; y: number } {
  const [x, y] = p.split(" ").map((v) => parseFloat(v));
  return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y };
}

// Recuadro para encuadrar una imagen: arrastrar (mover) + zoom (−/+).
// Controlado: recibe position/zoom y avisa de los cambios por onChange.
export function ImageFramer({
  url,
  position,
  zoom,
  onChange,
  size = "h-40 w-40",
}: {
  url: string;
  position: string;
  zoom: number;
  onChange: (position: string, zoom: number) => void;
  size?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ cx: number; cy: number; px: number; py: number } | null>(
    null,
  );

  function onMove(e: React.PointerEvent) {
    if (!drag.current || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.cx) / r.width) * 100;
    const dy = ((e.clientY - drag.current.cy) / r.height) * 100;
    const nx = clamp(drag.current.px - dx);
    const ny = clamp(drag.current.py - dy);
    onChange(`${Math.round(nx)}% ${Math.round(ny)}%`, zoom);
  }

  return (
    <div className="space-y-1">
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          const { x, y } = parsePos(position);
          drag.current = { cx: e.clientX, cy: e.clientY, px: x, py: y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        className={`relative ${size} cursor-move touch-none select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-50`}
        title="Arrastra la foto para encajarla"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          style={{ objectPosition: position, transform: `scale(${zoom})` }}
          className="pointer-events-none h-full w-full object-cover"
        />
        <span className="pointer-events-none absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white">
          <Move className="h-3 w-3" /> Arrastra
        </span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onChange(position, clampZoom(zoom - 0.25))}
          disabled={zoom <= 1}
          className="rounded border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="Alejar"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-9 text-center text-[10px] text-gray-500">
          {zoom.toFixed(2)}×
        </span>
        <button
          type="button"
          onClick={() => onChange(position, clampZoom(zoom + 0.25))}
          disabled={zoom >= 3}
          className="rounded border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label="Acercar"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
