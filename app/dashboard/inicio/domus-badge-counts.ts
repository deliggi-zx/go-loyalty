import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd, localYmd } from "@/app/(public)/[slug]/vet-appointments-config";

// Fase badges Domus: contadores para los círculos rojos de Consultas/
// Reuniones en DomusAgentPanel — un solo lugar para esta lógica, la usan
// las tres pantallas que renderizan ese panel (/domus/perfil,
// /dashboard/inicio, /dashboard en mobile), para no repetir el criterio
// tres veces y arriesgar que se desincronicen.
export interface DomusBadgeCounts {
  // Consultas con status='nuevo' únicamente — no leídas de verdad, a
  // diferencia de "Consultas sin responder" (que en /dashboard/inicio/
  // consultas también suma 'contactado'). Pedido explícito: el badge es
  // más estricto que esa bandeja. Fase 1c (rol agente): respeta la misma
  // visibilidad que /dashboard/consultas — ver agentProfileId abajo.
  consultasNuevoCount: number;
  // Ofertas 'reunion_agendada' + visitas 'confirmed' cuya fecha es HOY —
  // a diferencia de "Próximas reuniones" (que no filtraba por fecha, ver
  // versión previa de /perfil), acá sí importa el día. No tiene concepto
  // de asignación por agente todavía (fuera del alcance de la Fase 1c),
  // así que sigue siendo el total de la org para cualquier rol.
  reunionesHoyCount: number;
  // Fase reorganizar panel: ofertas 'nuevo' (recién llegadas, sin
  // revisar) + reservas 'pendiente_confirmacion' — un solo número
  // combinado para el botón "Ofertas/Reservas", mismo criterio de suma
  // que reunionesHoyCount arriba (ese ya combina dos tablas en un solo
  // conteo). Tampoco tiene concepto de asignación por agente, igual que
  // reunionesHoyCount.
  ofertasReservasCount: number;
}

// Fase 1c (rol agente): agentProfileId es el profile_id de quien pide el
// conteo — undefined/null (gerente, role admin) trae el total de la org
// sin filtrar, igual que siempre. Un profile_id (agente) filtra
// consultasNuevoCount a sin asignar + asignadas a él, mismo criterio
// .or() que la query de /dashboard/consultas.
export async function getDomusAgentBadgeCounts(
  orgId: string,
  agentProfileId?: string | null
): Promise<DomusBadgeCounts> {
  const supabase = createClient();
  const today = todayLocalYmd();

  let consultasQuery = supabase
    .from("domus_general_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "nuevo");
  if (agentProfileId) {
    consultasQuery = consultasQuery.or(`assigned_agent_id.is.null,assigned_agent_id.eq.${agentProfileId}`);
  }

  const [
    { count: consultasNuevoCount },
    { data: offersToday },
    { count: visitsHoyCount },
    { count: ofertasNuevoCount },
    { count: reservasPendientesCount },
  ] = await Promise.all([
    consultasQuery,
    // scheduled_at es timestamptz — se filtra por día en JS (mismo
    // criterio de hora local que todayLocalYmd/localYmd), no con un
    // rango de fechas en la query, para no armar límites UTC a mano.
    supabase
      .from("domus_property_offers")
      .select("scheduled_at")
      .eq("org_id", orgId)
      .eq("status", "reunion_agendada")
      .not("scheduled_at", "is", null),
    // visit_date ya es una columna date (no timestamp), así que acá sí
    // alcanza con un eq directo contra el string "YYYY-MM-DD".
    supabase
      .from("domus_property_visits")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "confirmed")
      .eq("visit_date", today),
    // Fase reorganizar panel: ofertasReservasCount.
    supabase
      .from("domus_property_offers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "nuevo"),
    supabase
      .from("domus_property_reservations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pendiente_confirmacion"),
  ]);

  const offersHoyCount = (offersToday ?? []).filter(
    (o) => o.scheduled_at && localYmd(new Date(o.scheduled_at)) === today
  ).length;

  return {
    consultasNuevoCount: consultasNuevoCount ?? 0,
    reunionesHoyCount: offersHoyCount + (visitsHoyCount ?? 0),
    ofertasReservasCount: (ofertasNuevoCount ?? 0) + (reservasPendientesCount ?? 0),
  };
}
