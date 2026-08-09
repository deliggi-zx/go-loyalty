import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getUserPointsBalance, getProductCategories, isVetOrgSlug, isCornerOrgSlug } from "./data";
import { VetChromeGate } from "./vet-chrome-gate";
import { CornerChromeGate } from "./corner-chrome-gate";
import { CornerBottomNav } from "./corner-bottom-nav";
import { ClientHeader } from "./client-header";
import { PointsBadge } from "./points-badge";
import { CartProvider } from "./cart-context";
import { WhatsAppButton } from "./whatsapp-button";
import { HeroVideo } from "./hero-video";
import { SectionNavTabs, type SectionNavTabItem } from "./section-nav-tabs";
import { getGymLocations } from "./gym-data";

// Copy de las franjas del hero, por org (keyed por slug). Cada org que
// quiera el ticker agrega su propia entrada acá — el componente no
// hardcodea texto de ninguna org. Frases de "bike" son placeholder de demo,
// ajustables después.
const TICKER_PHRASES: Record<string, { top: string[]; bottom: string[]; accent?: "neon" | "bike" }> = {
  gym2: {
    top: ["10% off en el plan anual", "Nueva sede en Sede Norte"],
    bottom: [
      "Clases ilimitadas en el plan Trimestral",
      "¡Sumate a Cross Funcional esta semana!",
    ],
  },
  bike: {
    top: ["Envíos a todo el país", "Financiación disponible"],
    bottom: ["Service técnico", "Repuestos originales en stock"],
    // Fase 3e: franjas en naranja para bike, Gym2 sigue en lima (default).
    accent: "bike",
  },
};

// Pestañas de navegación por anclas, por org (keyed por slug, mismo patrón
// que TICKER_PHRASES). "Catálogo" usa `href` en vez de `targetId` porque el
// listado de productos vive en /[slug]/precios, no en esta página — por eso
// es una función de slug y no un array fijo, para poder armar esa ruta.
// El componente sigue disponible para cualquier org futura que quiera la
// fila horizontal — "bike" se movió a VERTICAL_TABS (Fase 3d), no tiene
// entrada acá.
const SECTION_NAV_TABS: Record<string, (slug: string) => SectionNavTabItem[]> = {};

// Pestañas de vidrio verticales a los costados del video (ver
// VerticalGlassTabs), por org — mismo patrón slug-keyed, mismos items que
// antes vivían en SECTION_NAV_TABS. Hoy solo "bike" (Fase 3d): reemplaza ahí
// a la fila horizontal por la mecánica visual de NeonTabs (glass, hover/tap)
// pero en naranja y a ambos costados.
const VERTICAL_TABS: Record<
  string,
  (slug: string) => { left: SectionNavTabItem[]; right: SectionNavTabItem[] }
> = {
  bike: (slug) => ({
    left: [
      {
        label: "Nosotros",
        targetId: "quienes-somos",
        subtitle: "Mundo Bike, un mundo en dos ruedas",
      },
      {
        label: "Nuevos ingresos",
        targetId: "nuevos-ingresos",
        subtitle: "Recién llegados, sé el primero en conocerlos.",
      },
    ],
    right: [
      {
        label: "Catálogo",
        href: `/${slug}/precios`,
        subtitle: "Conocé nuestra tienda online.",
      },
      {
        label: "Imperdibles",
        targetId: "imperdibles",
        subtitle: "Ofertas y productos destacados.",
      },
    ],
  }),
};

// Header flotante transparente sobre el banner, con acento naranja propio
// (ver .bike-icon en globals.css) — hoy solo "bike" (Fase 3c). Mismo patrón
// slug-keyed que TICKER_PHRASES/SECTION_NAV_TABS: Cafetería de Prueba,
// Bicicletería de Prueba y Gym2 siguen con la barra sólida de siempre.
const FLOATING_HEADER_SLUGS = new Set(["bike"]);

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return notFound();

  const user = await getTenantUser();

  const productCategories =
    org.catalog_type === "products" ? await getProductCategories(org.id) : [];

  let userDisplayName: string | null = null;
  let transactions: { id: string; amount: number; claimed_at: string | null }[] = [];
  let pointsBalance = 0;

  if (user) {
    const supabase = createClient();
    const [{ data: profile }, { data: txs }, balance] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("loyalty_transactions")
        .select("id, amount, claimed_at")
        .eq("profile_id", user.id)
        .eq("org_id", org.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false }),
      getUserPointsBalance(org.id, user.id),
    ]);

    userDisplayName = profile?.full_name || user.email?.split("@")[0] || null;
    transactions = txs ?? [];
    pointsBalance = balance;
  }

  const primary = org.primary_color ?? "#f59e0b";

  // Mismo criterio que en page.tsx: las pestañas neón y el cartel diagonal
  // del hero son específicos del showroom de gimnasio (frases "Cross
  // Funcional", "plan anual", etc.), así que solo aparecen si esta org tiene
  // datos gym_* cargados. getGymLocations está envuelta en cache(), así que
  // esta llamada no duplica la query que hace page.tsx en el mismo request.
  const gymLocations = await getGymLocations(org.id);
  const hasGymFeatures = gymLocations.length > 0;
  const isFloatingHeaderOrg = FLOATING_HEADER_SLUGS.has(params.slug);

  // Veterinaria (Fase 0, Huellitas): la home es una pantalla bespoke propia
  // (video full-screen + botones huella, ver page.tsx/huellitas-home.tsx),
  // sin el header/banner/hero-video/ticker estándar de esta plantilla. En
  // subpáginas (Pet Shop, Perfil) esa chrome estándar sigue igual que
  // siempre — ver VetChromeGate.
  const hasVetFeatures = isVetOrgSlug(params.slug);

  // Fútbol 5/7/11 (Corner): home bespoke propia también (ver
  // page.tsx/corner-home.tsx), mismo mecanismo de exclusión en la home
  // (CornerChromeGate) que Huellitas. Se diferencia en que además monta
  // un bottom nav propio en TODAS sus rutas (no solo la home) — ver más
  // abajo, fuera del gate.
  const hasCornerFeatures = isCornerOrgSlug(params.slug);

  const bodyStyle: React.CSSProperties = org.background_url
    ? {
        backgroundImage: `url(${org.background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : org.background_color
    ? { backgroundColor: org.background_color }
    : { backgroundColor: "#fafaf9" };

  const header = (
    <ClientHeader
      orgName={org.name}
      primaryColor={primary}
      userDisplayName={user ? userDisplayName : null}
      catalogType={org.catalog_type}
      showLoginIcon={hasGymFeatures && !user}
      neonTheme={hasGymFeatures}
      requireInviteCode={hasGymFeatures}
      orgId={org.id}
      floatingOverlay={isFloatingHeaderOrg}
      showScanIcon={!isFloatingHeaderOrg}
      menuProps={{
        slug: params.slug,
        orgName: org.name,
        isLoggedIn: !!user,
        userName: userDisplayName,
        userEmail: user?.email ?? null,
        transactions,
        aboutText: org.about_text,
        phoneNumber: org.phone_number,
        whatsappNumber: org.whatsapp_number,
        facebookUrl: org.facebook_url,
        instagramUrl: org.instagram_url,
        twitterUrl: org.twitter_url,
        youtubeUrl: org.youtube_url,
        termsText: org.terms_text,
        primaryColor: primary,
        catalogType: org.catalog_type,
        productCategories,
      }}
    />
  );

  const pointsBadge = user && (
    <PointsBadge
      tierLabel={org.member_tier_label ?? "Socio Frecuente"}
      balance={pointsBalance}
      bikeTheme={isFloatingHeaderOrg}
    />
  );

  const banner = org.banner_url ? (
    <div className="w-full h-48 sm:h-64 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={org.banner_url} alt={org.name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div
      className="w-full h-48 sm:h-64 flex items-center justify-center"
      style={{ backgroundColor: primary }}
    >
      <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">{org.name}</h1>
    </div>
  );

  // Header + banner + video + tabs de siempre — sin cambios en su
  // contenido. Para orgs vet (hasVetFeatures) esto se envuelve en
  // VetChromeGate más abajo, que lo oculta solo en la home; en cualquier
  // otra org se renderiza siempre, igual que antes de esta fase.
  const standardChrome = (
    <>
      {/* Header + banner: "bike" (Fase 3c) los envuelve juntos en un
          contenedor relative para que el header flote transparente
          ENCIMA del banner (position absolute adentro). El resto de las
          orgs sigue con el header como barra sólida en flujo normal,
          arriba del banner — estructura sin cambios. */}
      {isFloatingHeaderOrg ? (
        <div className="relative">
          {header}
          {banner}
        </div>
      ) : (
        <>
          {header}
          {pointsBadge}
          {banner}
        </>
      )}

      {isFloatingHeaderOrg && pointsBadge}

      {/* Video: sección aparte debajo del banner, 4:3, autoplay muteado en loop */}
      <HeroVideo
        videoUrl={org.hero_video_url}
        showNeonTabs={hasGymFeatures}
        verticalTabs={VERTICAL_TABS[params.slug]?.(params.slug) ?? null}
        tickerPhrases={TICKER_PHRASES[params.slug] ?? null}
      />

      <SectionNavTabs items={SECTION_NAV_TABS[params.slug]?.(params.slug) ?? []} />
    </>
  );

  return (
    <CartProvider key={org.id}>
      <div className="min-h-screen" style={bodyStyle}>
        {hasVetFeatures ? (
          <VetChromeGate slug={params.slug}>{standardChrome}</VetChromeGate>
        ) : hasCornerFeatures ? (
          <CornerChromeGate slug={params.slug}>{standardChrome}</CornerChromeGate>
        ) : (
          standardChrome
        )}

        {children}

        <WhatsAppButton whatsappNumber={org.whatsapp_number} />

        {/* Fuera del gate a propósito: el bottom nav de Corner vive en
            todas sus rutas (home incluida), no solo en las subpáginas. */}
        {hasCornerFeatures && <CornerBottomNav slug={params.slug} />}
      </div>
    </CartProvider>
  );
}
