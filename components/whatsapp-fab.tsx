import { normalizeWhatsapp } from "@/lib/whatsapp";

// Botón flotante de WhatsApp. Usa el número registrado por el admin de la
// tienda. Si no hay número válido, no se muestra.
export function WhatsappFab({
  whatsapp,
  storeName,
}: {
  whatsapp?: string | null;
  storeName: string;
}) {
  const number = normalizeWhatsapp(whatsapp);
  if (number.length < 10) return null;

  const text = `Hola ${storeName}, quiero hacer un pedido.`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105 hover:shadow-xl"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 fill-white"
        aria-hidden="true"
      >
        <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.258.594 4.46 1.72 6.402L3.2 28.8l6.57-1.72a12.74 12.74 0 006.233 1.588h.005c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.8-12.668zm0 23.36h-.004a10.6 10.6 0 01-5.4-1.48l-.387-.23-4.02 1.053 1.073-3.92-.252-.402a10.56 10.56 0 01-1.62-5.64c0-5.85 4.76-10.61 10.614-10.61 2.835 0 5.5 1.105 7.504 3.11a10.54 10.54 0 013.107 7.507c0 5.85-4.76 10.612-10.61 10.612zm5.82-7.947c-.32-.16-1.888-.932-2.18-1.038-.292-.106-.505-.16-.718.16-.213.32-.824 1.038-1.01 1.25-.186.213-.372.24-.692.08-.32-.16-1.35-.498-2.57-1.586-.95-.847-1.59-1.893-1.776-2.213-.186-.32-.02-.492.14-.652.144-.143.32-.372.48-.558.16-.186.213-.32.32-.532.106-.213.053-.4-.027-.56-.08-.16-.717-1.73-.983-2.37-.258-.62-.52-.536-.717-.546l-.61-.01c-.213 0-.56.08-.852.4-.292.32-1.117 1.09-1.117 2.66s1.144 3.084 1.303 3.297c.16.213 2.25 3.436 5.45 4.818.762.33 1.356.526 1.82.674.765.243 1.46.209 2.01.127.613-.092 1.888-.772 2.154-1.518.266-.746.266-1.386.186-1.518-.08-.133-.293-.213-.613-.373z" />
      </svg>
    </a>
  );
}
