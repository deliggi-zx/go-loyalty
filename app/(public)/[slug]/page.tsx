import Link from "next/link";
import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getFeaturedProducts, getActiveCarousels, getUserPointsBalance, isVetOrgSlug, isCornerOrgSlug } from "./data";
import { getVetReviews } from "./vet-reviews-data";
import { getGymLocations, getGymClasses, getGymTestimonials } from "./gym-data";
import { GeneralInquiryForm } from "./general-inquiry-form";
import { DomusChatWidget } from "./domus-chat-widget";
import { BikeChatWidget } from "./bike-chat-widget";
import { Carousel } from "./carousel";
import { SocialLinks } from "./social-links";
import { GymAboutSection } from "./gym-about-section";
import { GymLocationsSection } from "./gym-locations-section";
import { GymClassesSection } from "./gym-classes-section";
import { GymTestimonialsSection } from "./gym-testimonials-section";
import { GymPlansSection } from "./gym-plans-section";
import { FeaturedProductsGrid } from "./featured-products-grid";
import { ProductRail } from "./product-rail";
import { BikePromoImage } from "./bike-promo-image";
import { HuellitasHome } from "./huellitas-home";
import { CornerHome } from "./corner-home";
import { getCornerLevelCard, getCornerNextReservationCourt, type LevelCard } from "./corner-data";

// Videos del hero de la home vet, por org (keyed por slug, mismo patrón que
// TICKER_PHRASES/VERTICAL_TABS en layout.tsx). 7 URLs, índice = Date.getDay()
// del cliente (0 domingo .. 6 sábado) — rotación simple sin tabla nueva ni
// backend, ver huellitas-home.tsx. Placeholders de stock (Pexels) hasta que
// se suba el material definitivo de la marca.
const VET_HOME_VIDEOS: Record<string, string[]> = {
  huellitas: [
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/domingo-grupo-mascotas.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/lunes-perro-corriendo.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/martes-gato-jugando.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/miercoles-revision-vet.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/jueves-bano-peluqueria.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/viernes-cachorro.mp4",
    "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/hero-videos/5a1d6e9e-a105-4c15-9fa2-1b05215797a3/sabado-gato-relax.mp4",
  ],
};

// Título arriba de la sección de promos + destacados, por org (keyed por
// slug, mismo patrón que TICKER_PHRASES/VERTICAL_TABS en layout.tsx). Otras
// orgs no tienen entrada acá — no se les fuerza el texto de bike.
const PROMOS_SECTION_TITLE: Record<string, string> = {
  bike: "IMPERDIBLES",
};

export default async function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  // Home de Veterinaria (Fase 0, Huellitas): pantalla bespoke propia (video
  // full-screen + botones huella), reemplaza todo el contenido de siempre
  // de esta página. layout.tsx ya se encarga de ocultar el header/banner/
  // hero-video estándar acá (ver VetChromeGate) — subpáginas como Pet Shop
  // siguen usando esta misma TenantPage sin este branch.
  if (isVetOrgSlug(params.slug)) {
    // getTenantUser() está cacheado con React cache() (data.ts) — pedirlo
    // acá no es un fetch extra, dedupea con cualquier otra llamada dentro
    // del mismo request tree. Se usa para que el ícono de cuenta sepa si
    // ya hay sesión (ver isLoggedIn en HuellitasHome) en vez de ofrecer
    // loguearse de nuevo a alguien que ya está logueado.
    const vetUser = await getTenantUser();
    // Vidriera de comentarios (solo lectura, ver VetReviewsDisplay): acá
    // no hace falta canDelete real (no hay botón de borrar en esta
    // pantalla) — null/null alcanza, sin pedir el role de más.
    const reviews = await getVetReviews(org.id, null, null);
    return (
      <HuellitasHome
        slug={params.slug}
        orgName={org.name}
        videos={VET_HOME_VIDEOS[params.slug] ?? []}
        primaryColor={org.primary_color ?? "#b98a72"}
        orgId={org.id}
        whatsappNumber={org.whatsapp_number}
        facebookUrl={org.facebook_url}
        instagramUrl={org.instagram_url}
        twitterUrl={org.twitter_url}
        youtubeUrl={org.youtube_url}
        isLoggedIn={!!vetUser}
        reviews={reviews}
      />
    );
  }

  // Home de Corner (showroom de fútbol 5/7/11, Fase 2): pantalla bespoke
  // propia, todo cosmético — mismo criterio que Huellitas arriba
  // (layout.tsx oculta la chrome estándar en la home vía
  // CornerChromeGate; el bottom nav nuevo vive en todas las rutas, ver
  // layout.tsx). "Tus puntos" es real si hay sesión y balance cargado;
  // si no, corner-home.tsx cae a un dato fijo de demo.
  if (isCornerOrgSlug(params.slug)) {
    const supabase = createClient();
    const cornerUser = await getTenantUser();

    const [{ data: profile }, balance, { data: content }, cornerLevelCard, nextReservationCourt] =
      await Promise.all([
        cornerUser
          ? supabase.from("profiles").select("full_name").eq("id", cornerUser.id).maybeSingle()
          : Promise.resolve({ data: null }),
        cornerUser ? getUserPointsBalance(org.id, cornerUser.id) : Promise.resolve(null),
        supabase
          .from("loyalty_content")
          .select("id, image_url, title, sort_order")
          .eq("org_id", org.id)
          .eq("is_active", true)
          .eq("type", "carousel")
          .order("sort_order", { ascending: true }),
        // AJUSTE 1: categoría (profesor/admin o socio ya en una clase) vs.
        // escalera (socio que solo alquila cancha) — sin sesión no aplica
        // ninguno de los dos, ver "default" abajo.
        cornerUser
          ? getCornerLevelCard(org.id, cornerUser.id)
          : Promise.resolve<LevelCard | null>(null),
        // Fase 3: cancha real para "Tu próxima reserva" si ya hay alguna
        // cargada (gym_courts) — null hasta entonces, cae al mock.
        getCornerNextReservationCourt(org.id),
      ]);

    const userName = profile?.full_name || cornerUser?.email?.split("@")[0] || "Socio";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

    return (
      <CornerHome
        slug={params.slug}
        greeting={greeting}
        userName={userName}
        pointsBalance={cornerUser ? balance : null}
        carouselItems={content ?? []}
        levelCard={cornerLevelCard ?? { mode: "default" }}
        nextReservationCourt={nextReservationCourt}
        heroPhotoUrl={org.banner_url}
      />
    );
  }

  const supabase = createClient();
  const user = await getTenantUser();

  const { data: content } = await supabase
    .from("loyalty_content")
    .select("id, type, title, price, category, image_url, sort_order")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .in("type", ["carousel", "promo"])
    .order("sort_order", { ascending: true });

  const carouselItems = content?.filter((c) => c.type === "carousel") ?? [];
  const promoItems = content?.filter((c) => c.type === "promo") ?? [];

  // Productos destacados (products.is_featured) — solo tiene sentido para
  // orgs con catálogo de productos. Vive debajo de las promos existentes,
  // en la misma sección "Imperdibles" (ver Fase 3b).
  const featuredProducts =
    org.catalog_type === "products" ? await getFeaturedProducts(org.id) : [];
  const promosSectionTitle = PROMOS_SECTION_TITLE[params.slug];

  // Fase Home: carruseles configurables desde el admin — independiente de
  // featuredProducts/is_featured de arriba (esa sigue siendo "Imperdibles",
  // sin tocar). [] para cualquier org que no sea catalog_type='products' o
  // que todavía no haya creado ninguno (mismo criterio de guard que
  // featuredProducts).
  const productCarousels =
    org.catalog_type === "products" ? await getActiveCarousels(org.id) : [];

  // Carrusel más grande + click para pausar/ampliar (Fase 3g) — hoy solo
  // "bike". Mismo criterio simple que ya usamos en perfil/page.tsx (slug
  // directo, no un mapa) porque es un único flag booleano en este archivo.
  const isBike = params.slug === "bike";

  // Fase 6 "Mundo Bike": mini galería de 3 fotos propias en "Nosotros",
  // en vez de reusar el banner principal ahí adentro (ver galleryUrls
  // en GymAboutSection). Solo se pide para bike — el resto de las orgs
  // no tiene filas type='nosotros_gallery', así que no hace falta ni
  // el gate para evitarles una query de más, pero se hace igual por
  // prolijidad (mismo criterio que featuredProducts/productCarousels
  // de acá arriba, scoped por condición).
  const { data: nosotrosGalleryData } = isBike
    ? await supabase
        .from("loyalty_content")
        .select("image_url")
        .eq("org_id", org.id)
        .eq("type", "nosotros_gallery")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: null };
  const nosotrosGalleryUrls = (nosotrosGalleryData ?? [])
    .map((r) => r.image_url)
    .filter((u): u is string => !!u);

  // Fase 2b Domus: mismo criterio simple (slug directo, un único flag en
  // este archivo) que isBike arriba — botón "Consultas" en la home
  // pública, scoped a esta org, no genérico.
  const isDomus = params.slug === "domus" || params.slug === "kapusta";

  // Calculadoras inmobiliarias: solo Kapusta (marca propia) — mismo
  // criterio de slug directo que isDomus/isBike.
  const isKapusta = params.slug === "kapusta";

  // Funcionalidad de gimnasio (Sedes, Clases, Comentarios): solo se muestra si
  // esta organización tiene datos cargados en las tablas gym_*. Ninguna otra
  // organización de Go Loyalty tiene filas ahí, así que no aparece para ellas.
  const [gymLocations, gymClasses, gymTestimonials] = await Promise.all([
    getGymLocations(org.id),
    getGymClasses(org.id),
    getGymTestimonials(org.id),
  ]);
  const hasGymFeatures = gymLocations.length > 0;

  const primary = org.primary_color ?? "#f59e0b";

  return (
    <>
      {/* Ajuste login-como-ícono (genérico, ver DOMUS_VISION.md pendiente
          del 21/08, completado ahora): el recuadro <LoginForm> inline que
          vivía acá se sacó para TODAS las orgs — el login se abre desde
          el ícono de usuario del header (ClientHeader/LoginModal), y con
          sesión ese mismo ícono lleva a /perfil (ver isLoggedIn en
          layout.tsx/client-header.tsx). */}

      {/* Fase 2b Domus: mismo criterio de login-gating que "Solicitar
          visita" en la ficha de producto (Fase 1) — sin sesión, mensaje
          en vez del botón "Consultas". Ajuste 1: ya no hay un LoginForm
          inline arriba para señalar (Domus usa el ícono del header, igual
          que Gym2) — el mensaje apunta ahí en vez de "arriba". */}
      {isDomus &&
        (user ? (
          <div id="consultas" className="max-w-lg mx-auto px-4 pt-4">
            <GeneralInquiryForm slug={params.slug} orgId={org.id} primaryColor={primary} />
          </div>
        ) : (
          <p id="consultas" className="max-w-lg mx-auto px-4 pt-4 text-xs text-stone-400 text-center">
            Iniciá sesión desde el ícono de arriba para hacer una consulta.
          </p>
        ))}

      {/* Calculadoras inmobiliarias — solo Kapusta. Entrada visible en la
          home a la sección /kapusta/calculadoras (la otra entrada es el
          drawer, ver side-menu.tsx). Mismo patrón de tarjeta-link que usan
          otras orgs para secciones que viven en otra ruta. */}
      {isKapusta && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Link
            href={`/${params.slug}/calculadoras`}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${primary}14`, color: primary }}
            >
              <Calculator className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-stone-900">Calculadoras</span>
              <span className="block text-xs text-stone-500">
                Crédito hipotecario, precio por m² y ajuste de alquiler por ICL
              </span>
            </span>
          </Link>
        </div>
      )}

      {/* Fase chatbot Domus: botón flotante propio en la home (no
          reemplaza ni convive mal con WhatsAppButton de layout.tsx —
          este vive apilado arriba, bottom-24 en vez de bottom-5, ver
          domus-chat-widget.tsx). Kapusta NO usa este launcher fijo: su
          chat vive en el dock flotante arrastrable de layout.tsx
          (KapustaFloatingDock), presente en todas las rutas. */}
      {isDomus && !isKapusta && (
        <DomusChatWidget slug={params.slug} orgId={org.id} whatsappNumber={org.whatsapp_number} />
      )}

      {/* Fase 5 "Mundo Bike": mismo mecanismo que el chat de Domus de
          arriba (botón flotante propio, apilado sobre WhatsAppButton de
          layout.tsx), acento naranja en vez de navy/sand — ver Gate 0.
          A diferencia de Domus, también vive en /precios (ver ese
          archivo), no solo acá. */}
      {isBike && (
        <BikeChatWidget slug={params.slug} orgId={org.id} whatsappNumber={org.whatsapp_number} />
      )}

      {/* Fase Home: carruseles configurables — debajo de la card de
          puntos (PointsBadge, en layout.tsx) y arriba del carrusel
          principal de loyalty_content de más abajo. [] para cualquier org
          sin carruseles activos, así que no agrega nada para Bike/Gym2/
          Corner/Huellitas/Cafetería/Bicicletería hoy. */}
      {productCarousels.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pt-4 space-y-8">
          {productCarousels.map((carousel) => (
            <ProductRail
              key={carousel.id}
              slug={params.slug}
              title={carousel.title}
              products={carousel.products}
              primaryColor={primary}
              catalogHref={`/${params.slug}/precios`}
              autoplay={carousel.autoplay}
              loopInfinite={carousel.loopInfinite}
              autoplaySpeedMs={carousel.autoplaySpeedMs}
              direction={carousel.direction}
            />
          ))}
        </div>
      )}

      {/* Quiénes Somos: para Gym2 sube por encima del carrusel principal
          (antes vivía junto a Sedes/Clases, más abajo). Se muestra para
          cualquier org que tenga about_text cargado — el componente ya es
          genérico, no hace falta estar atado a hasGymFeatures. Si la org no
          cargó about_text, no renderiza nada (ver GymAboutSection). */}
      {(hasGymFeatures || org.about_text) && (
        <div className={hasGymFeatures ? "max-w-5xl mx-auto px-4 pt-6" : "max-w-lg mx-auto px-4 pt-6"}>
          <GymAboutSection
            aboutText={org.about_text}
            bannerUrl={org.banner_url}
            orgName={org.name}
            title={isBike ? "Nosotros" : undefined}
            galleryUrls={isBike ? nosotrosGalleryUrls : undefined}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-8 space-y-6">
        {/* Carousel principal — en Gym2 usa un contenedor más ancho para
            aprovechar mejor las pantallas de escritorio; el resto de las
            orgs sigue con el ancho de siempre. El aspect-ratio 16:7 del
            carrusel (carousel.tsx) no cambia, así que en mobile se ve igual
            que antes: solo escala con el ancho disponible de la pantalla.
            id="nuevos-ingresos": destino de la pestaña "Nuevos ingresos" de
            SectionNavTabs (ver SECTION_NAV_TABS en layout.tsx).
            "bike" (Fase 3g): sin max-w acá — Carousel arma su propio ancho
            vía size="large" (ver sizeWrapperClass en carousel.tsx), así que
            un tope compitiendo acá lo recortaría de nuevo. */}
        {carouselItems.length > 0 && (
          <div
            id="nuevos-ingresos"
            className={
              (hasGymFeatures ? "max-w-5xl mx-auto" : isBike ? "" : "max-w-lg mx-auto") +
              " scroll-mt-16"
            }
          >
            <Carousel
              items={carouselItems}
              size={isBike ? "large" : "default"}
              enableLightbox={isBike}
              lightboxHref={isBike ? `/${params.slug}/precios` : undefined}
            />
          </div>
        )}

        {/* Promos + destacados. Las fotos de promo son EXACTAMENTE las de
            siempre, sin tocar (solo "bike" les suma el glow al click, ver
            BikePromoImage). id="imperdibles" NO va acá arriba — Fase 3i,
            Gate 6: antes arrancaba en la primera promo, por eso la pestaña
            "Imperdibles" caía arriba de las promos en vez de en el
            título+grilla. Ahora el ancla está en el wrapper de abajo,
            justo donde arranca ese bloque (siempre presente cuando esta
            sección se renderiza, así la pestaña nunca apunta a la nada
            aunque en el momento no haya ningún destacado). */}
        {(promoItems.length > 0 || featuredProducts.length > 0) && (
          <div className="max-w-lg mx-auto space-y-4">
            {promoItems.map((item) => {
              if (!item.image_url) return null;
              return isBike ? (
                <BikePromoImage key={item.id} imageUrl={item.image_url} alt={item.title ?? ""} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.id}
                  src={item.image_url}
                  alt={item.title ?? ""}
                  className="w-full h-auto rounded-2xl object-contain"
                />
              );
            })}

            {/* Fase 3f: el título se movió de arriba de las promos a acá,
                pegado a la grilla — misma condición que ya usa la grilla
                para no dejar huecos (sin destacados, ni título ni grilla). */}
            <div id="imperdibles" className="space-y-4 scroll-mt-16">
              {promosSectionTitle && featuredProducts.length > 0 && (
                <h2 className="bike-section-title text-2xl sm:text-3xl text-center">
                  {promosSectionTitle}
                </h2>
              )}

              <FeaturedProductsGrid
                slug={params.slug}
                products={featuredProducts}
                primaryColor={primary}
                catalogHref={`/${params.slug}/precios`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Funcionalidad de gimnasio (Sedes, Clases, Comentarios, Planes) */}
      {hasGymFeatures && (
        <div className="max-w-5xl mx-auto px-4 pb-8 space-y-10">
          <GymLocationsSection locations={gymLocations} slug={params.slug} />
          <GymClassesSection classes={gymClasses} />
          <GymTestimonialsSection
            testimonials={gymTestimonials}
            orgId={org.id}
            slug={params.slug}
            primaryColor={primary}
            isLoggedIn={!!user}
            backgroundUrl={org.banner_url}
            orgName={org.name}
          />
          <GymPlansSection />
        </div>
      )}

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 pb-8 pt-2 space-y-4">
        <SocialLinks
          facebookUrl={org.facebook_url}
          instagramUrl={org.instagram_url}
          twitterUrl={org.twitter_url}
          youtubeUrl={org.youtube_url}
          className="flex items-center justify-center gap-4"
        />
        <p className="text-center text-xs text-stone-400">
          Programa de fidelización por{" "}
          <span className="font-medium" style={{ color: primary }}>
            Go Loyalty
          </span>
        </p>
      </div>
    </>
  );
}
