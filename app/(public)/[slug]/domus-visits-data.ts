import { createClient } from "@/lib/supabase/server";

// Fase 1 Domus: turnos de visita a propiedad. Clon adaptado de
// vet-appointments-data.ts (Huellitas) — misma idea de "restar lo ya
// reservado", pero acá no hay grilla hardcodeada: la "grilla" es la unión
// de lo que cada agente cargó en domus_agent_availability. Ver
// domus-agent-availability-data.ts para lo que ve el propio agente en su
// panel (su disponibilidad + su agenda), esto es solo lo que ve el
// cliente en la ficha de la propiedad.

// Horarios libres de un día puntual, unión de TODOS los agentes de la
// org — el cliente no elige agente, cualquiera disponible se lo lleva
// (ver createPropertyVisit en domus-visits-actions.ts, que decide cuál).
// Dos pasadas en JS en vez de un NOT EXISTS en SQL (mismo criterio que
// getActiveCarousels en data.ts: el query builder de Supabase no arma
// subqueries correlacionadas, así que el cruce se hace acá).
export async function getAvailableVisitSlots(orgId: string, dateYmd: string): Promise<string[]> {
  const supabase = createClient();

  const { data: availabilityData } = await supabase
    .from("domus_agent_availability")
    .select("agent_profile_id, available_time")
    .eq("org_id", orgId)
    .eq("available_date", dateYmd);

  const availability = availabilityData ?? [];
  if (availability.length === 0) return [];

  const { data: visitsData } = await supabase
    .from("domus_property_visits")
    .select("agent_profile_id, visit_time")
    .eq("org_id", orgId)
    .eq("visit_date", dateYmd)
    .eq("status", "confirmed");

  // "agentId|HH:MM:SS" como clave — mismo formato en el que vuelven ambas
  // columnas time desde Postgres, no hace falta normalizar a "HH:MM" acá.
  const taken = new Set((visitsData ?? []).map((v) => `${v.agent_profile_id}|${v.visit_time}`));

  const freeTimes = new Set(
    availability
      .filter((a) => !taken.has(`${a.agent_profile_id}|${a.available_time}`))
      .map((a) => a.available_time.slice(0, 5))
  );

  return Array.from(freeTimes).sort();
}
