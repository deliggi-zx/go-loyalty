import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { publicBaseUrlForSlug } from "@/lib/org-domains";
import { DomusAgentPanel } from "./domus-agent-panel";
import { getDomusAgentBadgeCounts } from "./domus-badge-counts";
import { getKapustaPanelData } from "./kapusta-panel-data";

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

  const [{ data: org }, { data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("loyalty_organizations")
      .select("slug, primary_color, secondary_color, background_color")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("loyalty_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!org || (org.slug !== "domus" && org.slug !== "kapusta")) redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  const isKapusta = org.slug === "kapusta";
  const agentProfileId = membership.role === "admin" ? null : user.id;

  // Fase 1c (rol agente): el gerente (admin) sigue viendo el total de la
  // org; un agente solo ve lo que le corresponde (sin asignar + suyas).
  const { consultasNuevoCount, reunionesHoyCount, ofertasReservasCount } = await getDomusAgentBadgeCounts(
    orgId,
    agentProfileId
  );

  // Rediseño del panel de Kapusta (KAPUSTA_PANEL_SPEC): trae los conteos
  // extra (seguimiento, cartera, próxima visita). Domus no lo llama.
  const kapustaData = isKapusta ? await getKapustaPanelData(orgId, agentProfileId) : undefined;

  // Botón "‹ Ver sitio" del panel (pedido 05/09, solo Kapusta): misma
  // resolución de URL que el QR de bienvenida (dominio propio si lo tiene,
  // si no origin actual + /kapusta) — ver publicBaseUrlForSlug.
  let publicHomeHref: string | undefined;
  if (isKapusta) {
    const h = headers();
    const currentOrigin = `${h.get("x-forwarded-proto") ?? "https"}://${
      h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
    }`;
    publicHomeHref = publicBaseUrlForSlug(org.slug, currentOrigin);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {!isKapusta && (
        <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Inicio</h1>
            <p className="text-xs text-stone-400">No perderle el hilo a nada</p>
          </div>
        </header>
      )}

      <DomusAgentPanel
        orgId={orgId}
        consultasNuevoCount={consultasNuevoCount}
        reunionesHoyCount={reunionesHoyCount}
        ofertasReservasCount={ofertasReservasCount}
        slug={org.slug}
        userName={profile?.full_name ?? user.email?.split("@")[0] ?? null}
        kapustaData={kapustaData}
        publicHomeHref={publicHomeHref}
        primaryColor={org.primary_color ?? "#005F77"}
        secondaryColor={org.secondary_color ?? "#0180AB"}
        backgroundColor={org.background_color ?? "#69BDE1"}
      />
    </div>
  );
}
