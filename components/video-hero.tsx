// Portada con video (hero) para un look tipo landing. El video va en bucle y
// sin sonido (autoplay permitido). Muestra el nombre y la descripción encima.
export function VideoHero({
  videoUrl,
  poster,
  title,
  subtitle,
}: {
  videoUrl: string;
  poster?: string | null;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-black">
      <video
        src={videoUrl}
        poster={poster ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="h-[280px] w-full object-cover sm:h-[380px] md:h-[460px]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-white drop-shadow sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-lg text-sm text-white/90 drop-shadow sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
