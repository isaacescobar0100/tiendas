import type { StorePhoto } from "@/lib/store-photos";

/** Foto del negocio con su encuadre (posición y zoom elegidos al subirla). */
export function StorePhotoImg({
  photo,
  alt,
  className = "",
  eager = false,
}: {
  photo: StorePhoto;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover"
        style={{ objectPosition: photo.position, transform: `scale(${photo.zoom})` }}
      />
    </div>
  );
}
