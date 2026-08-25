import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd } from "./vet-appointments-config";

// Fase T2 "Mundo Bike" Taller: slots reservables del lado cliente.
// Inspirado en domus-visits-data.ts (misma idea de expandir rangos a
// bloques de 30 min y restar lo ya tomado), pero NO reusa sus tablas ni
// su código — acá hay una sola fuente (bike_workshop_availability, no
// hay "unión de agentes"), y la diferencia real es que cada slot tiene
// CUPO (workshop_capacity_per_slot), no es 1 turno = 1 slot ocupado como
// en las visitas de propiedad.
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

export interface WorkshopAvailableDay {
  date: string;
  slots: string[];
}

// Sin índice de exclusión en base (decidido en la Fase T1) — el chequeo
// de capacidad se hace acá, en la consulta, no a nivel de constraint.
// Riesgo menor aceptado para esta etapa de maqueta (mismo criterio ya
// aplicado a la condición de carrera de puntos en otras fases), NO
// bloquea nada real: en el peor caso dos clientes ven el mismo último
// cupo libre y uno de los dos se encuentra con "ya no hay lugar" al
// confirmar (ver createWorkshopAppointment en bike-workshop-actions.ts).
export async function getAvailableWorkshopDays(
  orgId: string,
  capacityPerSlot: number
): Promise<WorkshopAvailableDay[]> {
  const supabase = createClient();
  const today = todayLocalYmd();

  const { data: ranges } = await supabase
    .from("bike_workshop_availability")
    .select("date, start_time, end_time")
    .eq("org_id", orgId)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (!ranges || ranges.length === 0) return [];

  const dates = Array.from(new Set(ranges.map((r) => r.date)));

  const { data: appointments } = await supabase
    .from("bike_workshop_appointments")
    .select("date, start_time")
    .eq("org_id", orgId)
    .in("date", dates)
    .in("status", ["pending", "confirmed"]);

  const countBySlot = new Map<string, number>();
  for (const a of appointments ?? []) {
    const key = `${a.date}|${a.start_time.slice(0, 5)}`;
    countBySlot.set(key, (countBySlot.get(key) ?? 0) + 1);
  }

  const slotsByDate = new Map<string, Set<string>>();
  for (const range of ranges) {
    const daySlots = slotsByDate.get(range.date) ?? new Set<string>();
    for (const slot of generateSlotsInRange(range.start_time, range.end_time)) {
      const taken = countBySlot.get(`${range.date}|${slot}`) ?? 0;
      if (taken < capacityPerSlot) daySlots.add(slot);
    }
    slotsByDate.set(range.date, daySlots);
  }

  return dates
    .map((date) => ({ date, slots: Array.from(slotsByDate.get(date) ?? []).sort() }))
    .filter((d) => d.slots.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Usado por createWorkshopAppointment (bike-workshop-actions.ts) para
// re-validar, al momento de confirmar, que el horario pedido: 1) cae
// justo en un bloque de 30 min de un rango cargado por el admin (evita
// aceptar un horario arbitrario que el cliente nunca vio ofrecido,
// mismo criterio que findAvailableAgentForSlot en Domus), y 2) todavía
// tiene cupo — no confía en lo que se mostró en pantalla, por si cambió
// entre que el cliente cargó la vista y confirmó.
export async function isWorkshopSlotAvailable(
  orgId: string,
  dateYmd: string,
  timeHm: string,
  capacityPerSlot: number
): Promise<boolean> {
  const supabase = createClient();

  const { data: ranges } = await supabase
    .from("bike_workshop_availability")
    .select("start_time, end_time")
    .eq("org_id", orgId)
    .eq("date", dateYmd);

  const withinRange = (ranges ?? []).some((r) =>
    generateSlotsInRange(r.start_time, r.end_time).includes(timeHm)
  );
  if (!withinRange) return false;

  const { count } = await supabase
    .from("bike_workshop_appointments")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("date", dateYmd)
    .eq("start_time", timeHm)
    .in("status", ["pending", "confirmed"]);

  return (count ?? 0) < capacityPerSlot;
}
