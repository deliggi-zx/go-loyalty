import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getUserPointsBalance, getProductCategories, isVetOrgSlug, isCornerOrgSlug } from "./data";
import { VetChromeGate } from "./vet-chrome-gate";
import { CornerChromeGate } from "./corner-chrome-gate";
import { CornerBottomNav } from "./corner-bottom-nav";
import { CornerReserveProvider } from "./corner-reserve-context";
import { getCornerCourts } from "./corner-data";
import { ClientHeader } from "./client-header";
import { PointsBadge } from "./points-badge";
import { CartProvider } from "./cart-context";
import { WhatsAppButton } from "./whatsapp-button";
import { HeroVideo } from "./hero-video";
import { SectionNavTabs, type SectionNavTabItem } from "./section-nav-tabs";
import { getGymLocations } from "./gym-data";
import { ORG_LOGO_LOCKUP } from "@/lib/org-logo-lockup";

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

// Lockup de logo (isotipo + wordmark) para el fallback del banner cuando
// la org todavía no subió una foto propia (Fase logo, SuperElectro) —
// mismo patrón slug-keyed que el resto de estos mapas. Si mañana Die sube
// un banner_url para esta org, el <img> normal de banner_url gana y este
// fallback deja de usarse solo; no hace falta sacarlo de acá. Cualquier
// otra org sin banner_url que no esté en este mapa sigue con el fallback
// de texto (h1 con org.name) de siempre.
// Movido a lib/org-logo-lockup.ts (Fase sidebar responsive) — el panel
// admin necesitó el mismo mapa, ver comentario ahí.

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
  // Fase íconos de staff (Domus): rol de este usuario en esta org — solo
  // hace falta cuando es Domus (el resto de las orgs no lee esto), pero
  // se resuelve acá adentro del `if (user)` ya existente en vez de
  // condicionar también por isDomusOrg, para no adelantar esa variable
  // (se calcula más abajo) ni duplicar el chequeo de sesión.
  let domusMemberRole: string | null = null;

  if (user) {
    const supabase = createClient();
    const [{ data: profile }, { data: txs }, balance, membershipRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("loyalty_transactions")
        .select("id, amount, claimed_at")
        .eq("profile_id", user.id)
        .eq("org_id", org.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false }),
      getUserPointsBalance(org.id, user.id),
      params.slug === "domus"
        ? supabase
            .from("loyalty_members")
            .select("role")
            .eq("org_id", org.id)
            .eq("profile_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    userDisplayName = profile?.full_name || user.email?.split("@")[0] || null;
    transactions = txs ?? [];
    pointsBalance = balance;
    domusMemberRole = membershipRes.data?.role ?? null;
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

  // Ajuste 1 Domus: mismo criterio simple (slug directo) que ORG_LOGO_LOCKUP/
  // isVetOrgSlug de este archivo — Domus también abre el login desde el
  // ícono del header en vez del recuadro inline de la home (ver showLoginIcon
  // más abajo), pero SIN heredar neonTheme ni requireInviteCode: esos dos
  // siguen exclusivos de Gym2 (showLoginIcon ya es una prop independiente de
  // neonTheme en ClientHeader/LoginModal, no hace falta tocar nada ahí).
  const isDomusOrg = params.slug === "domus";
  // Fase íconos de staff: agente o gerente de Domus — mismo criterio
  // admin/agente que dashboard/layout.tsx (isDomusStaff ahí). Un cliente
  // de Domus, o cualquier usuario de cualquier otra org, queda en false
  // y el header no cambia en nada (ver showStaffIcons en ClientHeader).
  const isDomusStaff = isDomusOrg && (domusMemberRole === "admin" || domusMemberRole === "agente");

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

  // Fase 4: canchas reales para el paso 1 del modal de reserva — una sola
  // consulta acá, repartida a CornerReserveProvider (que envuelve tanto
  // {children} como el bottom nav, así el modal es una única instancia
  // compartida por los 3 disparadores). Vacío para cualquier org que no
  // sea Corner.
  const cornerCourts = hasCornerFeatures ? await getCornerCourts(org.id) : [];

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
      showLoginIcon={(hasGymFeatures || isDomusOrg) && !user}
      neonTheme={hasGymFeatures}
      requireInviteCode={hasGymFeatures}
      orgId={org.id}
      floatingOverlay={isFloatingHeaderOrg}
      showScanIcon={!isFloatingHeaderOrg}
      orgSlug={params.slug}
      isDomusStaff={isDomusStaff}
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

  // Fase puntos fuera de Domus: Domus no tiene ninguna mecánica real de
  // puntos en ningún lado (no hay flujo de "compra" que emita sellos) —
  // el badge chico "tierLabel · balance pts" se oculta site-wide para
  // esta org, no solo en /perfil (mismo criterio que showLoginIcon un
  // poco más arriba: chrome compartido por layout.tsx, no algo que se
  // pueda scopear por página sin lógica nueva de ruta). El resto de las
  // orgs sigue viéndolo exactamente igual.
  const pointsBadge = user && !isDomusOrg && (
    <PointsBadge
      tierLabel={org.member_tier_label ?? "Socio Frecuente"}
      balance={pointsBalance}
      bikeTheme={isFloatingHeaderOrg}
    />
  );

  const logoLockup = ORG_LOGO_LOCKUP[params.slug];

  const banner = org.banner_url ? (
    <div className="w-full h-48 sm:h-64 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={org.banner_url} alt={org.name} className="w-full h-full object-cover" />
    </div>
  ) : logoLockup ? (
    // Fase logo (SuperElectro): el lockup (isotipo + wordmark) ya trae su
    // propio texto — fondo blanco de la org en vez del bloque de color
    // primario con <h1>, porque el logo está pensado para verse sobre
    // fondo claro, no sobre el azul de acento.
    <div
      className="w-full h-48 sm:h-64 flex items-center justify-center px-10"
      style={{ backgroundColor: org.background_color ?? "#ffffff" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoLockup} alt={org.name} className="max-w-full max-h-full object-contain" />
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

      {/* Vive adentro de standardChrome (no como hermano suelto) para que
          VetChromeGate lo oculte en la home de orgs vet igual que el resto
          de la chrome estándar — si no, el día que Huellitas cargue un
          whatsapp_number quedaría duplicado con el botón-huella de
          WhatsApp propio de HuellitasHome. En subpáginas (Pet Shop, etc.)
          sigue apareciendo como siempre. */}
      <WhatsAppButton whatsappNumber={org.whatsapp_number} />
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

        {/* Fase 4: CornerReserveProvider envuelve tanto {children} (donde
            vive el disparador "Reservar" de la home, ver corner-home.tsx)
            como el bottom nav de acá abajo, para que el modal sea una
            única instancia compartida por los 3 disparadores. Ninguna
            otra org monta este provider. WhatsAppButton NO va acá — ya
            vive una sola vez dentro de standardChrome (ver fix de
            Huellitas más arriba, PR #2); repetirlo acá lo duplicaría de
            nuevo para cualquier org con whatsapp_number cargado. */}
        {hasCornerFeatures ? (
          <CornerReserveProvider courts={cornerCourts}>
            {children}

            {/* Fuera del gate a propósito: el bottom nav de Corner vive en
                todas sus rutas (home incluida), no solo en las
                subpáginas. */}
            <CornerBottomNav slug={params.slug} isLoggedIn={!!user} />
          </CornerReserveProvider>
        ) : (
          children
        )}
      </div>
    </CartProvider>
  );
}
