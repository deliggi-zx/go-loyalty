import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { DomusAgentPanel } from "./domus-agent-panel";
import { getDomusAgentBadgeCounts } from "./domus-badge-counts";

// Fase 1c (rol agente): antes solo admin (mismo gate que Visitas/
// Ofertas, que siguen siendo solo gerente) — ahora también agente, para
// que pueda llegar a este panel y ver su badge de Consultas.
const ALLOWED_ROLES = ["admin", "agente"];

// Fase 4b (rev. Unificar panel del agente): antes esta pantalla tenía
// una grilla propia de 4 botones en desktop (sin Catálogo, sin badges)
// y usaba DomusMobileHome solo en mobile — ahora, en cualquier
// viewport, muestra el mismo DomusAgentPanel de 5 botones que
// /domus/perfil (Fase Home mobile Domus / CAMBIO 1), para que ambas
// pantallas sean literalmente la misma UI. Cada botón lleva a una lista
// propia que mezcla domus_general_inquiries/domus_property_offers/
// domus_property_visits al momento de mostrar, sin tabla nueva — ver
// cada subpágina.
export default async function InicioPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: org }, { data: membership }] = await Promise.all([
    supabase.from("loyalty_organizations").select("slug").eq("id", orgId).maybeSingle(),
    supabase
      .from("loyalty_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (org?.slug !== "domus" && org?.slug !== "kapusta") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  // Fase 1c (rol agente): el gerente (admin) sigue viendo el total de la
  // org; un agente solo ve lo que le corresponde (sin asignar + suyas).
  const { consultasNuevoCount, reunionesHoyCount, ofertasReservasCount } = await getDomusAgentBadgeCounts(
    orgId,
    membership.role === "admin" ? null : user.id
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Inicio</h1>
          <p className="text-xs text-stone-400">No perderle el hilo a nada</p>
        </div>
      </header>

      <DomusAgentPanel
        orgId={orgId}
        consultasNuevoCount={consultasNuevoCount}
        reunionesHoyCount={reunionesHoyCount}
        ofertasReservasCount={ofertasReservasCount}
      />
    </div>
  );
}
