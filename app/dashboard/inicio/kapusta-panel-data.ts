import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";
import { getDomusAgentBadgeCounts } from "./domus-badge-counts";

// Datos del panel del equipo rediseñado de Kapusta (ver
// handoff/KAPUSTA_PANEL_SPEC.md §4 y kapusta-team-panel.tsx). Todo sale de
// tablas que ya existen; hoy la pantalla no las consulta. Solo se usa
// cuando slug === "kapusta" — Domus sigue con getDomusAgentBadgeCounts a
// secas.
//
// Los tres primeros conteos (consultas / visitas hoy / ofertas y reservas)
// se reusan tal cual de getDomusAgentBadgeCounts para no duplicar
// criterios de status. Los otros tres se calculan acá.

export interface KapustaPanelData {
  consultasSinAsignar: number;
  // Visitas confirmadas + reuniones (de ofertas y manuales) para hoy.
  visitasReunionesHoy: number;
  ofertasReservasNuevas: number;
  seguimientosEnCurso: number;
  fichasCartera: number;
  proximaVisita: { titulo: string; zona: string | null; hora: string } | null;
}

// Mismo criterio de scoping por rol que el resto del panel: con
// agentProfileId (rol agente) los conteos que soportan asignación se
// acotan a lo propio; sin él (gerente / rol admin) es el total de la org.
// Ofertas, reservas y visitas todavía no tienen asignación por
// profesional (igual que en domus-badge-counts.ts), así que para esos el
// número es el de la org en cualquier caso.
export async function getKapustaPanelData(
  orgId: string,
  agentProfileId?: string | null
): Promise<KapustaPanelData> {
  const supabase = createClient();
  const today = todayLocalYmd();

  const [
    badgeCounts,
    { count: seguimientoOffersCount },
    { count: seguimientoInquiriesCount },
    { data: carteraInquiries },
    { data: carteraOffers },
    { data: carteraVisits },
    { data: proximasVisitas },
    { count: meetingsTodayCount },
  ] = await Promise.all([
    getDomusAgentBadgeCounts(orgId, agentProfileId),
    supabase
      .from("domus_property_offers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "seguimiento"),
    supabase
      .from("domus_general_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "contactado"),
    supabase.from("domus_general_inquiries").select("client_profile_id").eq("org_id", orgId),
    supabase.from("domus_property_offers").select("owner_profile_id").eq("org_id", orgId),
    supabase
      .from("domus_property_visits")
      .select("client_profile_id")
      .eq("org_id", orgId)
      .eq("status", "confirmed"),
    // Próxima visita: la primera confirmada de hoy en adelante. Se traen
    // unas pocas y se elige en JS la primera cuyo horario todavía no pasó
    // (para no mostrar una de hoy más temprano ya vencida).
    supabase
      .from("domus_property_visits")
      .select("product_id, visit_date, visit_time")
      .eq("org_id", orgId)
      .eq("status", "confirmed")
      .gte("visit_date", today)
      .order("visit_date", { ascending: true })
      .order("visit_time", { ascending: true })
      .limit(8),
    supabase
      .from("kapusta_meetings")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("meeting_date", today),
  ]);

  // Cartera de clientes: profiles distintos que aparecen en cualquiera de
  // las tres tablas (mismo criterio que /dashboard/inicio/contactos).
  const carteraIds = new Set<string>();
  for (const r of carteraInquiries ?? []) if (r.client_profile_id) carteraIds.add(r.client_profile_id);
  for (const r of carteraOffers ?? []) if (r.owner_profile_id) carteraIds.add(r.owner_profile_id);
  for (const r of carteraVisits ?? []) if (r.client_profile_id) carteraIds.add(r.client_profile_id);

  // Próxima visita: primera cuyo día/hora sea >= ahora.
  const now = new Date();
  const nextVisit = (proximasVisitas ?? []).find((v) => {
    const [h, m] = String(v.visit_time).split(":");
    const dt = new Date(`${v.visit_date}T${String(h).padStart(2, "0")}:${String(m ?? "0").padStart(2, "0")}:00`);
    return dt.getTime() >= now.getTime();
  });

  let proximaVisita: KapustaPanelData["proximaVisita"] = null;
  if (nextVisit) {
    const { data: product } = await supabase
      .from("products")
      .select("name, specs")
      .eq("id", nextVisit.product_id)
      .maybeSingle();
    const barrio = (product?.specs as Record<string, unknown> | null)?.["barrio"];
    proximaVisita = {
      titulo: product?.name ?? "Propiedad",
      zona: typeof barrio === "string" && barrio.trim() ? barrio.trim() : null,
      hora: String(nextVisit.visit_time).slice(0, 5),
    };
  }

  return {
    consultasSinAsignar: badgeCounts.consultasNuevoCount,
    visitasReunionesHoy: badgeCounts.reunionesHoyCount + (meetingsTodayCount ?? 0),
    ofertasReservasNuevas: badgeCounts.ofertasReservasCount,
    seguimientosEnCurso: (seguimientoOffersCount ?? 0) + (seguimientoInquiriesCount ?? 0),
    fichasCartera: carteraIds.size,
    proximaVisita,
  };
}
