import { parseCoverVideo } from "@/lib/video";

// Portada con video (hero) para un look tipo landing. El video va en bucle y
// sin sonido. Puede ser un archivo (subido o enlazado) o un enlace de YouTube /
// Vimeo, que se recorta para CUBRIR la portada (sin franjas negras).
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
  const video = parseCoverVideo(videoUrl);
  if (!video) return null;
  return (
    <div className="relative mb-8 h-[280px] overflow-hidden rounded-2xl border border-line bg-black [container-type:size] sm:h-[380px] md:h-[460px]">
      {video.kind === "file" ? (
        <video
          src={video.src}
          poster={poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {/* 16:9 que cubre el contenedor (unidades de contenedor cqw/cqh) */}
          <iframe
            src={video.src}
            title={`Video de ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 border-0"
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-10">
        <h1 className="text-3xl font-bold text-white drop-shadow sm:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-lg text-sm text-white drop-shadow sm:text-base">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
