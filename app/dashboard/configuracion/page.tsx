import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { publicBaseUrlForSlug } from "@/lib/org-domains";
import { hasFeature, isRealEstateOrg } from "@/lib/features";
import { AppearanceForm } from "./appearance-form";
import { WelcomeQr } from "./welcome-qr";
import { CarouselManager } from "./carousel-manager";
import { PromoManager } from "./promo-manager";
import { PriceListManager } from "./price-list-manager";
import { ContactForm } from "./contact-form";
import { RequirementsForm } from "./requirements-form";
import { WorkshopCapacityForm } from "./workshop-capacity-form";
import { GoogleCalendarConnect } from "./google-calendar-connect";
import { getConnectionInfo, isCalendarConfigured } from "@/lib/google-calendar-oauth";

export default async function ConfiguracionPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/login");

  const [orgRes, contentRes] = await Promise.all([
    supabase
      .from("loyalty_organizations")
      .select(
        "id, slug, name, banner_url, background_url, background_color, primary_color, secondary_color, accent_color, member_tier_label, next_reward_threshold, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url, terms_text, rental_requirements_text, purchase_requirements_text, workshop_capacity_per_slot, feature_tier, feature_overrides"
      )
      .eq("id", orgId)
      .single(),
    supabase
      .from("loyalty_content")
      .select("id, type, title, price, category, image_url, sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!orgRes.data) redirect("/login");

  const org = orgRes.data;
  const carouselItems =
    contentRes.data?.filter((c) => c.type === "carousel") ?? [];
  const promoItems = contentRes.data?.filter((c) => c.type === "promo") ?? [];
  const priceItems =
    contentRes.data?.filter((c) => c.type === "price_list") ?? [];

  // Vertical inmobiliaria (cualquier nivel): Configuración reordenada — QR
  // arriba (si tiene fidelización), Contacto, Requisitos; sin Lista de
  // precios / Carrusel / Colores / Banner / Fondo; "Promos" → "Flyers".
  const isRealEstate = isRealEstateOrg(org);
  const showWelcomeQr = hasFeature(org, "fidelizacion_qr");
  const showRequisitos = hasFeature(org, "requisitos_operacion");
  const showGoogleCalendar = hasFeature(org, "google_calendar");

  // URL de la página de bienvenida para el QR imprimible. Dominio propio si
  // lo tiene (kapusta.com.ar/bienvenida), si no el origin actual + /<slug>/bienvenida.
  const h = headers();
  const currentOrigin = `${h.get("x-forwarded-proto") ?? "https"}://${
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  }`;
  const welcomeUrl = showWelcomeQr
    ? `${publicBaseUrlForSlug(org.slug!, currentOrigin)}/bienvenida`
    : null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: membership }, calendarConnection] = await Promise.all([
    showGoogleCalendar && user
      ? supabase.from("loyalty_members").select("role").eq("org_id", orgId).eq("profile_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    showGoogleCalendar ? getConnectionInfo(orgId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Configuración
          </h1>
          <p className="text-xs text-stone-400">
            Personalizá la página pública de tu comercio
          </p>
        </div>
        {org.slug && (
          <a
            href={`/${org.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
          >
            Ver página pública ↗
          </a>
        )}
      </header>

      <div className="p-8 space-y-10 max-w-3xl">
        {isRealEstate ? (
          // Configuración reordenada de la vertical inmobiliaria (aplica a
          // los 3 niveles): QR de fidelización arriba (si la org lo tiene),
          // Contacto y redes, Requisitos (si la org lo tiene). Sin Carrusel
          // (se gestiona desde Catálogo), sin Lista de precios, y Apariencia
          // sin Banner/Fondo/Colores de marca. "Promos" → "Flyers".
          <>
            {welcomeUrl && <WelcomeQr url={welcomeUrl} />}
            <ContactForm org={org} />
            {showRequisitos && <RequirementsForm org={org} />}
            <AppearanceForm
              org={org}
              hideBannerBgColors
              title={showWelcomeQr ? "Fidelización" : undefined}
              description={
                showWelcomeQr
                  ? "Cómo ven los clientes su tipo de socio y su progreso de puntos"
                  : undefined
              }
            />
            <PromoManager orgId={orgId} items={promoItems} title="Flyers" />
            {showGoogleCalendar && (
              <GoogleCalendarConnect
                configured={isCalendarConfigured()}
                connectedEmail={calendarConnection?.connectedEmail ?? null}
                connectedAt={calendarConnection?.connectedAt ?? null}
                canManage={membership?.role === "admin"}
              />
            )}
          </>
        ) : (
          <>
            <AppearanceForm org={org} />
            <CarouselManager orgId={orgId} items={carouselItems} />
            <PromoManager orgId={orgId} items={promoItems} />
            <PriceListManager orgId={orgId} items={priceItems} />
            <ContactForm org={org} />
            {/* Fase T1 "Mundo Bike" Taller: solo bike tiene taller de
                service — el resto de las orgs no ve este bloque. */}
            {org.slug === "bike" && <WorkshopCapacityForm org={org} />}
          </>
        )}
      </div>
    </div>
  );
}
