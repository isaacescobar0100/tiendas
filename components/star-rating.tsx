import { Star } from "lucide-react";

// Muestra 5 estrellas rellenas según `value` (0–5). Componente de solo lectura.
export function StarRating({
  value,
  count,
  size = "sm",
  showCount = true,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}) {
  const px = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const rounded = Math.round(value * 2) / 2; // al medio más cercano

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = rounded >= n ? 1 : rounded >= n - 0.5 ? 0.5 : 0;
          return (
            <span key={n} className={`relative ${px}`}>
              <Star className={`${px} absolute inset-0 text-gray-300`} />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: fill === 0.5 ? "50%" : "100%" }}
                >
                  <Star
                    className={`${px} fill-amber-400 text-amber-400`}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showCount && count != null && count > 0 && (
        <span className="text-xs text-gray-500">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </span>
  );
}
