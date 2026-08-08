import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser } from "./data";
import { getGymLocations, getGymClasses, getGymTestimonials } from "./gym-data";
import { LoginForm } from "./login-form";
import { Carousel } from "./carousel";
import { SocialLinks } from "./social-links";
import { GymAboutSection } from "./gym-about-section";
import { GymLocationsSection } from "./gym-locations-section";
import { GymClassesSection } from "./gym-classes-section";
import { GymTestimonialsSection } from "./gym-testimonials-section";
import { GymPlansSection } from "./gym-plans-section";

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
          (antes vivía junto a Sedes/Clases, más abajo). */}
      {hasGymFeatures && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
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
            que antes: solo escala con el ancho disponible de la pantalla. */}
        {carouselItems.length > 0 && (
          <div className={hasGymFeatures ? "max-w-5xl mx-auto" : "max-w-lg mx-auto"}>
            <Carousel items={carouselItems} />
          </div>
        )}

        {/* Promos, en columna */}
        {promoItems.length > 0 && (
          <div className="max-w-lg mx-auto space-y-4">
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
