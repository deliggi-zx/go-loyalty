import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getFeaturedProducts } from "./data";
import { getGymLocations, getGymClasses, getGymTestimonials } from "./gym-data";
import { LoginForm } from "./login-form";
import { Carousel } from "./carousel";
import { SocialLinks } from "./social-links";
import { GymAboutSection } from "./gym-about-section";
import { GymLocationsSection } from "./gym-locations-section";
import { GymClassesSection } from "./gym-classes-section";
import { GymTestimonialsSection } from "./gym-testimonials-section";
import { GymPlansSection } from "./gym-plans-section";
import { FeaturedProductsGrid } from "./featured-products-grid";

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

  // Carrusel más grande + click para pausar/ampliar (Fase 3g) — hoy solo
  // "bike". Mismo criterio simple que ya usamos en perfil/page.tsx (slug
  // directo, no un mapa) porque es un único flag booleano en este archivo.
  const isBike = params.slug === "bike";

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
      {/* Login (solo si no hay sesión; si hay sesión, el badge de puntos ya se muestra en el layout).
          Gym2 no usa este recuadro: ahí el login se abre desde el ícono de
          usuario del header (ver hasGymFeatures + showLoginIcon en layout.tsx). */}
      {!user && !hasGymFeatures && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <LoginForm primaryColor={primary} />
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

        {/* Promos + destacados. id="imperdibles": destino de la pestaña
            "Imperdibles" de SectionNavTabs/VerticalGlassTabs (ver layout.tsx).
            El wrapper aparece si hay promos O destacados, para que el ancla
            siempre tenga algo a donde apuntar. Las fotos de promo son
            EXACTAMENTE las de siempre, sin tocar; la grilla de productos
            destacados (Fase 3b) es un bloque nuevo, aparte, debajo. */}
        {(promoItems.length > 0 || featuredProducts.length > 0) && (
          <div id="imperdibles" className="max-w-lg mx-auto space-y-4 scroll-mt-16">
            {promoItems.map(
              (item) =>
                item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.image_url}
                    alt={item.title ?? ""}
                    className="w-full h-auto rounded-2xl object-contain"
                  />
                )
            )}

            {/* Fase 3f: el título se movió de arriba de las promos a acá,
                pegado a la grilla — misma condición que ya usa la grilla
                para no dejar huecos (sin destacados, ni título ni grilla). */}
            {promosSectionTitle && featuredProducts.length > 0 && (
              <h2 className="bike-section-title text-2xl sm:text-3xl text-center">
                {promosSectionTitle}
              </h2>
            )}

            <FeaturedProductsGrid
              products={featuredProducts}
              primaryColor={primary}
              catalogHref={`/${params.slug}/precios`}
            />
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
