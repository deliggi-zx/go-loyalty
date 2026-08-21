import { createClient } from "@/lib/supabase/server";

// Fase 1 Domus: turnos de visita a propiedad. Clon adaptado de
// vet-appointments-data.ts (Huellitas) — misma idea de "restar lo ya
// reservado", pero acá no hay grilla hardcodeada: la "grilla" es la unión
// de lo que cada agente cargó en domus_agent_availability. Ver
// domus-agent-availability-data.ts para lo que ve el propio agente en su
// panel (su disponibilidad + su agenda), esto es solo lo que ve el
// cliente en la ficha de la propiedad.

// Fase turnos-rango: domus_agent_availability ya no guarda un horario
// puntual por fila, sino un rango (start_time/end_time) por día. Acá se
// expande cada rango a bloques de 30 min — ej. 09:00-18:00 → 09:00,
// 09:30, ... 17:30 (el último bloque arranca antes del cierre, no hace
// falta que entre otro bloque entero después).
const SLOT_MINUTES = 30;

function timeToMinutes(hm: string): number {
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlotsInRange(startTime: string, endTime: string): string[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots: string[] = [];
  for (let t = start; t < end; t += SLOT_MINUTES) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

interface AgentRange {
  agent_profile_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

async function getAgentRangesForDate(orgId: string, dateYmd: string): Promise<AgentRange[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("domus_agent_availability")
    .select("agent_profile_id, start_time, end_time, created_at")
    .eq("org_id", orgId)
    .eq("available_date", dateYmd);
  return data ?? [];
}

// "pending" cuenta como tomado, no solo "confirmed" — un horario que un
// cliente ya pidió y está esperando confirmación no se le puede ofrecer a
// otro cliente (mismo criterio que el índice único parcial en DB).
async function getTakenSlotsForDate(orgId: string, dateYmd: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("domus_property_visits")
    .select("agent_profile_id, visit_time")
    .eq("org_id", orgId)
    .eq("visit_date", dateYmd)
    .in("status", ["pending", "confirmed"]);
  return new Set((data ?? []).map((v) => `${v.agent_profile_id}|${v.visit_time.slice(0, 5)}`));
}

// Horarios libres de un día puntual, unión de TODOS los agentes de la
// org — el cliente no elige agente, cualquiera disponible se lo lleva
// (ver findAvailableAgentForSlot, que decide cuál al confirmar el pedido).
export async function getAvailableVisitSlots(orgId: string, dateYmd: string): Promise<string[]> {
  const ranges = await getAgentRangesForDate(orgId, dateYmd);
  if (ranges.length === 0) return [];

  const taken = await getTakenSlotsForDate(orgId, dateYmd);

  const freeTimes = new Set<string>();
  for (const range of ranges) {
    for (const slot of generateSlotsInRange(range.start_time, range.end_time)) {
      if (!taken.has(`${range.agent_profile_id}|${slot}`)) {
        freeTimes.add(slot);
      }
    }
  }

  return Array.from(freeTimes).sort();
}

// Usado por createPropertyVisit (domus-visits-actions.ts) para elegir qué
// agente se queda la visita: mismo criterio que antes (el que cargó
// disponibilidad hace más tiempo, created_at asc) pero ahora resuelto
// contra rangos en vez de filas puntuales, validando además que el
// horario pedido caiga justo en uno de los bloques de 30 min generados
// (evita aceptar un horario arbitrario que el cliente nunca vio ofrecido).
export async function findAvailableAgentForSlot(
  orgId: string,
  dateYmd: string,
  timeHm: string
): Promise<string | null> {
  const ranges = await getAgentRangesForDate(orgId, dateYmd);
  const taken = await getTakenSlotsForDate(orgId, dateYmd);

  const candidates = ranges
    .filter((r) => generateSlotsInRange(r.start_time, r.end_time).includes(timeHm))
    .filter((r) => !taken.has(`${r.agent_profile_id}|${timeHm}`))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return candidates[0]?.agent_profile_id ?? null;
}
