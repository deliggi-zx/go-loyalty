import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { Sidebar } from "@/components/dashboard/sidebar";

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
  let showConsultas = false;
  let showOfertas = false;
  let showInicio = false;
  if (orgId) {
    const [{ data: org }, { count: gymLocationsCount }, { data: membership }] = await Promise.all([
      supabase
        .from("loyalty_organizations")
        .select("catalog_type, slug")
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
    // Fase 1 Domus: panel de visitas (agenda + disponibilidad propia),
    // mismo criterio de flag local por slug que isVetOrg/isCornerOrg
    // arriba. Solo role admin (hoy el único role que representa "agente"
    // en esta org, ver [[domus-test-users]]) — no hay un role 'vet'
    // equivalente que sumar acá.
    const isDomusOrg = org?.slug === "domus";
    const isDomusAdmin = isDomusOrg && membership?.role === "admin";
    showVisitas = isDomusAdmin;
    // Fase 2b: panel de consultas, mismo gate exacto que Visitas arriba
    // (por ahora coinciden 1 a 1, mismo criterio de flags separados que
    // showMascotas/showTurnos de Huellitas: no tienen por qué seguir
    // coincidiendo si el día de mañana alguno se habilita para otro role).
    showConsultas = isDomusAdmin;
    // Fase 3: panel de ofertas ("ofrecer mi propiedad"), mismo gate exacto
    // que Visitas/Consultas arriba.
    showOfertas = isDomusAdmin;
    // Fase 4b: mini-CRM del agente (Contactos/Consultas/Reuniones/
    // Seguimiento), mismo gate exacto que Visitas/Consultas/Ofertas. No
    // reemplaza el redirect de /login (compartido con todas las orgs,
    // ver Gate 0 de esta fase) — vive como primer ítem del sidebar.
    showInicio = isDomusAdmin;
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar
        userEmail={user.email ?? ""}
        showCatalog={catalogType === "products"}
        showGym={hasGymFeatures}
        showCourts={isCornerOrg}
        showMascotas={showMascotas}
        showTurnos={showTurnos}
        showVisitas={showVisitas}
        showConsultas={showConsultas}
        showOfertas={showOfertas}
        showInicio={showInicio}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
