// Video de portada: un archivo subido (Vercel Blob), un enlace directo a un
// .mp4/.webm, o un enlace de YouTube / Vimeo (se muestra con su reproductor,
// en bucle y sin sonido, como fondo).

export type CoverVideo =
  | { kind: "file"; src: string }
  | { kind: "youtube"; id: string; src: string }
  | { kind: "vimeo"; id: string; src: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseCoverVideo(raw: string | null | undefined): CoverVideo | null {
  const value = (raw ?? "").trim();
  if (!value || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  // YouTube: watch?v=, youtu.be/, /shorts/, /embed/
  let yt: string | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    yt =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ??
      null;
  } else if (host === "youtu.be") {
    yt = url.pathname.slice(1).split("/")[0] || null;
  }
  if (yt) {
    if (!YT_ID.test(yt)) return null;
    const p = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      playlist: yt,
      controls: "0",
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      // Permite activar/desactivar el sonido desde la página (botón de sonido).
      enablejsapi: "1",
    });
    return { kind: "youtube", id: yt, src: `https://www.youtube-nocookie.com/embed/${yt}?${p}` };
  }

  // Vimeo: vimeo.com/123456 o player.vimeo.com/video/123456
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(\d{5,})/)?.[1];
    if (!id) return null;
    return {
      kind: "vimeo",
      id,
      // Sin "background" (que fuerza el silencio): así el botón puede activar el sonido.
      src: `https://player.vimeo.com/video/${id}?autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0&dnt=1`,
    };
  }

  // Archivo de video directo (subido o enlazado). Solo https.
  if (url.protocol === "https:") return { kind: "file", src: url.toString() };
  return null;
}

/** Reproductor "de verdad" (con sonido y controles) para ver un video en grande. */
export function videoPlayerSrc(v: CoverVideo): string {
  if (v.kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
  }
  if (v.kind === "vimeo") return `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1`;
  return v.src;
}

/** Miniatura del video si la red la ofrece sin API (YouTube); si no, null. */
export function videoThumb(v: CoverVideo): string | null {
  return v.kind === "youtube" ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null;
}
