import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { aboutIsLive, parseAbout, SOCIAL_KEYS, type AboutMedia, type SocialKey } from "@/lib/about";
import { parseStorePhotos, type StorePhoto } from "@/lib/store-photos";
import { StorePhotoImg } from "@/components/store-photo";
import { fillGrid } from "@/lib/grid-fill";
import { bogotaDow, DAY_ORDER, getStoreOpenState, parseStoreHours } from "@/lib/store-hours";
import { whatsappLink } from "@/lib/whatsapp";
import { storeBasePath, joinStorePath } from "@/lib/store-path";
import { BannerSlider } from "@/components/banner-slider";
import { MissionTabs } from "@/components/about/mission-tabs";
import { MediaGallery } from "@/components/about/media-gallery";
import { JsonLd } from "@/components/json-ld";
import { storeUrl, faqJsonLd, breadcrumbJsonLd, directionsUrl, sedeSlug as sedePath } from "@/lib/seo";
import { SocialIcon } from "@/components/about/social-icon";

async function getStore(slug: string) {
  return prisma.store.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      seoCity: true,
      type: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      bannerVideoUrl: true,
      photosJson: true,
      hoursJson: true,
      aboutJson: true,
      whatsapp: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStore(storeSlug);
  if (!store) return { title: "Tienda no encontrada" };
  const about = parseAbout(store.aboutJson);
  const description = about.intro || about.story.slice(0, 160) || store.description || undefined;
  const canonical = storeUrl(store, "/nosotros");
  return {
    title: "Conócenos",
    description,
    alternates: { canonical },
    openGraph: {
      title: `Conócenos · ${store.name}`,
      description,
      url: canonical,
      images: store.logoUrl ? [store.logoUrl] : [],
      locale: "es_CO",
    },
  };
}

const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  website: "Sitio web",
};

// "18:30" → "6:30 p. m."
function hour12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ¿Es un celular colombiano (para ofrecer WhatsApp además de llamar)?
function isMobileCo(number: string): boolean {
  const d = number.replace(/\D/g, "");
  return /^3\d{9}$/.test(d) || /^573\d{9}$/.test(d);
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStore(storeSlug);
  if (!store) notFound();
  const about = parseAbout(store.aboutJson);
  if (!aboutIsLive(about)) notFound();

  // Rutas de la tienda: sin el slug si se visita por su subdominio/dominio.
  const storeBase = await storeBasePath(storeSlug);
  const sh = (p = "") => joinStorePath(storeBase, p);
  const isFood = store.type === "FOOD";

  const locations = await prisma.storeLocation.findMany({
    where: { storeId: store.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { name: true, address: true, whatsapp: true, lat: true, lng: true, mapsUrl: true },
  });
  // Galería: lo que el admin subió aquí + las fotos del negocio (Apariencia).
  const gallery: AboutMedia[] = [
    ...about.gallery,
    ...parseStorePhotos(store.photosJson)
      .filter((ph) => !about.gallery.some((g) => g.url === ph.url))
      .map((ph) => ({ kind: "image" as const, url: ph.url, caption: "" })),
  ];
  // La elegida en el admin (con su encuadre) o, si no hay, la primera foto.
  const firstPhoto = gallery.find((g) => g.kind === "image");
  const featured: StorePhoto | null =
    about.storyPhoto ?? (firstPhoto ? { url: firstPhoto.url, position: "50% 50%", zoom: 1 } : null);
  const locGrid = fillGrid(locations.length);
  const contactGrid = fillGrid(about.phones.length + about.emails.length);
  const hours = parseStoreHours(store.hoursJson);
  const showHours = !!hours?.enabled;
  const open = getStoreOpenState(store.hoursJson);
  const today = bogotaDow();
  const socials = SOCIAL_KEYS.filter((k) => about.socials[k]);
  const hasContact = about.phones.length > 0 || about.emails.length > 0 || socials.length > 0;

  // Índice de secciones (solo las que tienen contenido).
  const nav = [
    about.story ? { id: "quienes-somos", label: "Quiénes somos" } : null,
    gallery.length ? { id: "galeria", label: "Galería" } : null,
    about.mission || about.vision ? { id: "mision-vision", label: "Misión y visión" } : null,
    about.values.length ? { id: "valores", label: "Valores" } : null,
    locations.length || showHours ? { id: "visitanos", label: "Visítanos" } : null,
    hasContact ? { id: "contacto", label: "Contacto" } : null,
    about.faqs.length ? { id: "preguntas", label: "Preguntas" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div>
      {/* Portada limpia (su arte ya trae texto); la bienvenida va debajo. */}
      {(store.bannerUrl || store.bannerVideoUrl) && (
        <BannerSlider
          slides={[
            {
              imageUrl: store.bannerUrl,
              videoUrl: store.bannerVideoUrl,
              title: null,
              subtitle: null,
              linkUrl: null,
            },
          ]}
        />
      )}
      {/* Preguntas frecuentes y migas de pan: Google y los buscadores con IA. */}
      <JsonLd data={faqJsonLd(about.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: store.name, url: storeUrl(store) },
          { name: "Conócenos", url: storeUrl(store, "/nosotros") },
        ])}
      />
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-text">Conócenos</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {about.headline || `Bienvenidos a ${store.name}`}
        </h1>
        {about.intro && <p className="mt-3 text-lg text-ink-2">{about.intro}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={sh()}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink shadow-sm transition hover:bg-brand-hover"
          >
            {isFood ? "Ver el menú" : "Ver la tienda"} <ChevronRight className="h-4 w-4" />
          </Link>
          {hasContact && (
            <a
              href="#contacto"
              className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-ink"
            >
              <Phone className="h-4 w-4" /> Contáctanos
            </a>
          )}
        </div>
      </header>

      {nav.length > 1 && (
        <nav
          aria-label="Secciones de la página"
          className="sticky top-[57px] z-[5] -mx-4 mb-10 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur"
        >
          <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {nav.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className="inline-block whitespace-nowrap rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink-2 transition hover:border-brand hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-20 [&>section]:scroll-mt-32">
        {about.story && (
          <section id="quienes-somos" aria-labelledby="h-quienes" className="reveal">
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 rounded-[2rem] border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div>
                <SectionTitle id="h-quienes" kicker="Nuestra historia">
                  Quiénes somos
                </SectionTitle>
                <div className="space-y-4 text-lg leading-relaxed text-ink-2">
                  {about.story.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className={`whitespace-pre-line ${i === 0 ? "text-xl font-medium text-ink sm:text-2xl" : ""}`}>
                      {p}
                    </p>
                  ))}
                </div>
                {about.highlights.length > 0 && (
                  <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {about.highlights.map((h, i) => (
                      <div key={i} className="rounded-2xl bg-brand-soft px-4 py-3">
                        <dt className="sr-only">{h.label}</dt>
                        <dd className="text-3xl font-extrabold tracking-tight text-brand-text">{h.value}</dd>
                        <dd className="mt-0.5 text-sm leading-snug text-ink-2">{h.label}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
              {featured && (
                <div className="relative">
                  <div className="absolute -inset-3 -z-0 rotate-2 rounded-[2rem] bg-brand/25" aria-hidden />
                  <StorePhotoImg
                    photo={featured}
                    alt={`Foto de ${store.name}`}
                    className="relative aspect-[4/5] w-full rounded-[1.75rem] shadow-xl ring-1 ring-line"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section id="galeria" aria-labelledby="h-galeria" className="reveal">
            <SectionTitle id="h-galeria" kicker="Fotos y videos">
              Galería
            </SectionTitle>
            <MediaGallery items={gallery} name={store.name} />
          </section>
        )}

        {(about.mission || about.vision) && (
          <section id="mision-vision" aria-labelledby="h-mision" className="reveal">
            <SectionTitle id="h-mision" kicker="Lo que nos mueve">
              Misión y visión
            </SectionTitle>
            <div className="max-w-3xl">
              <MissionTabs mission={about.mission} vision={about.vision} />
            </div>
          </section>
        )}

        {about.values.length > 0 && (
          <section id="valores" aria-labelledby="h-valores" className="reveal">
            <SectionTitle id="h-valores" kicker="En lo que creemos">
              Nuestros valores
            </SectionTitle>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {about.values.map((v, i) => (
                <li
                  key={i}
                  className="group rounded-3xl border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-lg"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-lg font-extrabold text-brand-text transition group-hover:bg-brand group-hover:text-brand-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink">{v.title}</h3>
                  {v.text && <p className="mt-1 text-ink-3">{v.text}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(locations.length > 0 || showHours) && (
          <section id="visitanos" aria-labelledby="h-visitanos" className="reveal">
            <SectionTitle id="h-visitanos" kicker="Te esperamos">
              Visítanos
            </SectionTitle>
            <div className="space-y-4">
              {locations.length > 0 && (
                <ul className={`${locGrid.grid} gap-4`}>
                  {locations.map((l, i) => {
                    const wa = whatsappLink(l.whatsapp, `Hola ${l.name}, tengo una pregunta.`);
                    return (
                      <li
                        key={`${i}-${l.name}`}
                        className={`flex flex-col rounded-3xl border border-line bg-surface p-5 ${i === locations.length - 1 ? locGrid.last : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-text">
                            <MapPin className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-ink">{l.name}</p>
                            {l.address && <p className="mt-0.5 text-sm text-ink-3">{l.address}</p>}
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap gap-2 pt-4">
                          <Link
                            href={sh(`/sedes/${sedePath(l.name)}`)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
                          >
                            <MapPin className="h-4 w-4" /> Ver sede
                          </Link>
                          {directionsUrl(l) && (
                            <a
                              href={directionsUrl(l)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
                            >
                              <Navigation className="h-4 w-4" /> Cómo llegar
                            </a>
                          )}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink hover:bg-brand-hover"
                            >
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {showHours && hours && (
                <div className="rounded-3xl border border-line bg-surface p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-bold text-ink">
                      <Clock className="h-5 w-5 text-brand-text" /> Horario
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        open.isOpen ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink"
                      }`}
                    >
                      {open.isOpen ? "Abierto ahora" : "Cerrado ahora"}
                    </span>
                  </div>
                  {/* Celular: lista; pantalla grande: los 7 días en fila */}
                  <dl className="divide-y divide-line text-sm lg:grid lg:grid-cols-7 lg:gap-2 lg:divide-y-0">
                    {DAY_ORDER.map(({ idx, label }) => {
                      const d = hours.days[idx];
                      const isToday = idx === today;
                      return (
                        <div
                          key={idx}
                          className={`flex justify-between gap-3 py-2 lg:flex-col lg:justify-start lg:gap-1 lg:rounded-2xl lg:px-3 lg:py-3 ${
                            isToday ? "font-semibold text-ink lg:bg-brand-soft" : "text-ink-2 lg:bg-surface-2"
                          }`}
                        >
                          <dt>
                            {label}
                            {isToday && <span className="ml-1.5 text-xs font-medium text-brand-text">hoy</span>}
                          </dt>
                          <dd className="text-right lg:text-left">
                            {d.closed || !d.open || !d.close ? (
                              "Cerrado"
                            ) : (
                              <>
                                <span className="whitespace-nowrap">{hour12(d.open)}</span> –{" "}
                                <span className="whitespace-nowrap">{hour12(d.close)}</span>
                              </>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {!open.isOpen && open.message && <p className="mt-3 text-xs text-ink-3">{open.message}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {hasContact && (
          <section id="contacto" aria-labelledby="h-contacto" className="reveal">
            <SectionTitle id="h-contacto" kicker="Hablemos">
              Contacto
            </SectionTitle>
            <div className={`${contactGrid.grid} gap-4`}>
              {about.phones.map((p, i) => {
                const wa = isMobileCo(p.number) ? whatsappLink(p.number, `Hola ${store.name}`) : null;
                return (
                  <div
                    key={`p${i}`}
                    className={`rounded-3xl border border-line bg-surface p-5 ${!about.emails.length && i === about.phones.length - 1 ? contactGrid.last : ""}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{p.label || "Teléfono"}</p>
                    <p className="mt-1 text-xl font-bold text-ink">{p.number}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`tel:${p.number.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
                      >
                        <Phone className="h-4 w-4" /> Llamar
                      </a>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink hover:bg-brand-hover"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {about.emails.map((m, i) => (
                <a
                  key={`m${i}`}
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`${m.label || "Contacto"} · ${store.name}`)}`}
                  className={`group rounded-3xl border border-line bg-surface p-5 transition hover:border-brand ${i === about.emails.length - 1 ? contactGrid.last : ""}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{m.label || "Correo"}</p>
                  <p className="mt-1 break-all text-lg font-bold text-ink">{m.email}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                    <Mail className="h-4 w-4" /> Escríbenos
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </a>
              ))}
            </div>
            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-3" aria-label="Redes sociales">
                {socials.map((k) => (
                  <li key={k}>
                    <a
                      href={about.socials[k]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:-translate-y-0.5 hover:border-brand hover:text-ink"
                    >
                      <SocialIcon name={k} /> {SOCIAL_LABEL[k]}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {about.faqs.length > 0 && (
          <section id="preguntas" aria-labelledby="h-preguntas" className="reveal">
            <SectionTitle id="h-preguntas" kicker="Resolvemos tus dudas">
              Preguntas frecuentes
            </SectionTitle>
            <div className="max-w-3xl space-y-3">
              {about.faqs.map((f, i) => (
                <details
                  key={i}
                  name="faq"
                  className="group rounded-2xl border border-line bg-surface open:border-brand"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition group-open:rotate-180" />
                  </summary>
                  <p className="whitespace-pre-line px-5 pb-5 leading-relaxed text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Cierre: de vuelta a comprar */}
        <section className="reveal overflow-hidden rounded-3xl bg-brand px-6 py-10 text-center text-brand-ink sm:px-12">
          <Sparkles className="mx-auto h-8 w-8 opacity-80" aria-hidden />
          <p className="mt-3 text-2xl font-extrabold sm:text-3xl">
            {isFood ? "¿Te antojaste?" : "¿Listo para comprar?"}
          </p>
          <p className="mx-auto mt-2 max-w-md opacity-90">
            {isFood ? "Pide en línea y recíbelo donde estés." : "Mira todo lo que tenemos para ti."}
          </p>
          <Link
            href={sh()}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-surface px-6 py-3 text-sm font-bold text-ink shadow-lg transition hover:-translate-y-0.5"
          >
            {isFood ? "Ver el menú" : "Ver la tienda"} <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-text">{kicker}</p>
      <h2 id={id} className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {children}
      </h2>
    </div>
  );
}
