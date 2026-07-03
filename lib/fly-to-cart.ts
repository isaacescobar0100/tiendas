/**
 * Efecto visual: una miniatura "vuela" desde el producto hasta el icono del
 * carrito de la cabecera. Solo animación en el cliente (no toca el estado).
 */
export function flyToCart(
  sourceEl: HTMLElement | null,
  imageUrl?: string | null,
) {
  if (typeof window === "undefined" || !sourceEl) return;
  const target = document.getElementById("cart-target");
  if (!target) return;

  const s = sourceEl.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = Math.min(s.width, 72) || 48;

  const fly = document.createElement("div");
  fly.style.position = "fixed";
  fly.style.left = `${s.left + s.width / 2 - size / 2}px`;
  fly.style.top = `${s.top + s.height / 2 - size / 2}px`;
  fly.style.width = `${size}px`;
  fly.style.height = `${size}px`;
  fly.style.borderRadius = "9999px";
  fly.style.zIndex = "60";
  fly.style.pointerEvents = "none";
  fly.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
  fly.style.transition =
    "transform 0.7s cubic-bezier(0.2,0.7,0.3,1), opacity 0.7s ease-in";
  if (imageUrl) {
    fly.style.backgroundImage = `url("${imageUrl}")`;
    fly.style.backgroundSize = "cover";
    fly.style.backgroundPosition = "center";
  } else {
    fly.style.background = "#111827";
  }
  document.body.appendChild(fly);

  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);

  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
    fly.style.opacity = "0.2";
  });

  // Pequeño "latido" del icono del carrito al llegar
  window.setTimeout(() => {
    target.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.25)" },
        { transform: "scale(1)" },
      ],
      { duration: 250, easing: "ease-out" },
    );
  }, 650);

  window.setTimeout(() => fly.remove(), 750);
}
