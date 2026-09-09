import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ORG_LOGO_LOCKUP } from "@/lib/org-logo-lockup";
import { hasFeature, isRealEstateOrg } from "@/lib/features";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getOrgId();
  let catalogType: string | null = null;
  let hasGymFeatures = false;
  let isCornerOrg = false;
  let showMascotas = false;
  let showTurnos = false;
  let showVisitas = false;
  let showTaller = false;
  let showConsultas = false;
  let showOfertas = false;
  let showReservas = false;
  let showInicio = false;
  let orgName: string | undefined;
  let orgSlug: string | undefined;
  // Hoisted: hace falta también fuera del if de abajo, para hideMobileNav.
  let isDomusStaff = false;
  if (orgId) {
    const [{ data: org }, { count: gymLocationsCount }, { data: membership }] = await Promise.all([
      // Fase sidebar responsive: se suma "name" — antes no se pedía
      // (nadie lo necesitaba), hace falta para reemplazar el "Go
      // Loyalty" hardcodeado del sidebar por el nombre real de la org.
      supabase
        .from("loyalty_organizations")
        .select("catalog_type, slug, name, feature_tier, feature_overrides")
        .eq("id", orgId)
        .maybeSingle(),
      // Mismo criterio hasGymFeatures que el sitio público (org con filas
      // en gym_locations) — no hardcodeado a Gym2.
      supabase
        .from("gym_locations")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      // Role del usuario actual en esta org — hace falta acá (y no solo en
      // mascotas/page.tsx) porque el ítem del sidebar no debería ofrecerse
      // ni a un customer de Huellitas ni a nadie de otra org.
      supabase
        .from("loyalty_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);
    catalogType = org?.catalog_type ?? null;
    hasGymFeatures = (gymLocationsCount ?? 0) > 0;
    orgName = org?.name ?? undefined;
    orgSlug = org?.slug ?? undefined;
    // Fase 3 de Corner: panel de canchas (gym_courts), gateado por slug —
    // mismo criterio que isCornerOrgSlug en el sitio público, pero
    // chequeado acá directo (un solo flag, un solo archivo, no amerita
    // importar el helper del route group público).
    isCornerOrg = org?.slug === "corner";
    // Fase 1 de Huellitas: panel de mascotas, mismo criterio de flag local
    // que isCornerOrg de arriba — pero acá además requiere role admin/vet
    // (el control de acceso real vive en mascotas/page.tsx, esto es solo
    // para no ofrecer el link en el nav a quien no puede usarlo).
    const isVetOrg = org?.slug === "huellitas";
    const isAdminOrVetRole = membership?.role === "admin" || membership?.role === "vet";
    showMascotas = isVetOrg && isAdminOrVetRole;
    // Fase 3: panel de turnos, mismo gate exacto que Mascotas arriba (por
    // ahora coinciden 1 a 1 — quedan como flags separados, no uno solo
    // reusado para los dos, porque no tienen por qué seguir coincidiendo
    // si el día de mañana alguno de los dos se habilita para otro role).
    showTurnos = isVetOrg && isAdminOrVetRole;
    // Vertical inmobiliaria (Inmo Básica / Pro / 360) — ver lib/features.ts.
    // "agente" es un segundo role de staff que entra a Inicio/Consultas
    // (ve solo lo suyo, ver ALLOWED_ROLES de esas páginas) pero NO a
    // Visitas/Ofertas/Reservas, que siguen siendo solo del gerente (admin).
    const isDomusOrg = isRealEstateOrg(org);
    const isRealEstateStaffRole = isDomusOrg && (membership?.role === "admin" || membership?.role === "agente");
    isDomusStaff = isRealEstateStaffRole;
    // Visitas / Ofertas / Reservas: nivel Pro, solo el gerente (admin).
    showVisitas = hasFeature(org, "agenda_visitas") && membership?.role === "admin";
    // Fase T1 "Mundo Bike" Taller: panel de disponibilidad, mismo criterio
    // de flag local por slug que isDomusOrg arriba. Solo role admin —
    // mismo criterio isBikeAdmin ya usado en /perfil (Fase P5) y
    // layout.tsx del sitio público (Fase 3j).
    const isBikeOrg = org?.slug === "bike";
    showTaller = isBikeOrg && membership?.role === "admin";
    // CRM de consultas y leads (nivel Pro): Consultas e Inicio los ve
    // cualquier staff (admin + agente); Ofertas y Reservas, solo el gerente.
    const hasCrm = hasFeature(org, "crm_leads");
    showConsultas = hasCrm && isRealEstateStaffRole;
    showOfertas = hasCrm && membership?.role === "admin";
    showReservas = hasFeature(org, "reservas_propiedad") && membership?.role === "admin";
    showInicio = hasCrm && isRealEstateStaffRole;
  }

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      showCatalog={catalogType === "products"}
      showGym={hasGymFeatures}
      showCourts={isCornerOrg}
      showMascotas={showMascotas}
      showTurnos={showTurnos}
      showVisitas={showVisitas}
      showTaller={showTaller}
      showConsultas={showConsultas}
      showOfertas={showOfertas}
      showReservas={showReservas}
      showInicio={showInicio}
      orgName={orgName}
      orgLogo={orgSlug ? ORG_LOGO_LOCKUP[orgSlug] ?? null : null}
      hideMobileNav={isDomusStaff}
    >
      {children}
    </DashboardShell>
  );
}
