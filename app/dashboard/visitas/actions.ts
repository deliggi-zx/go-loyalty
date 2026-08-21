"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";

async function requireAgent() {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  return { supabase, orgId, agentProfileId: user.id };
}

export interface AddAvailabilityRangeResult {
  ok: boolean;
  added: number;
  skipped: number;
  error?: "invalid";
}

// Fase turnos-rango (CAMBIO 1): reemplaza addAvailability (un horario
// puntual por llamada) por esto — el agente tilda uno o más días en un
// calendario simple y carga UN rango Desde/Hasta que se aplica a todos,
// una fila por día tildado. Inserta de a una fila (no un insert masivo)
// para que un día ya cargado con ese mismo rango exacto (23505, choca con
// el unique de la migración) no aborte el resto del lote — se cuenta como
// "salteado" y se sigue con los demás días. El agente puede repetir esta
// carga las veces que quiera con distintos días/rangos, se van acumulando.
export async function addAvailabilityRange(
  dates: string[],
  startTime: string,
  endTime: string
): Promise<AddAvailabilityRangeResult> {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  if (dates.length === 0) return { ok: false, added: 0, skipped: 0, error: "invalid" };
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { ok: false, added: 0, skipped: 0, error: "invalid" };
  }
  if (startTime >= endTime) return { ok: false, added: 0, skipped: 0, error: "invalid" };

  const today = todayLocalYmd();
  for (const dateYmd of dates) {
    const parsedDate = new Date(`${dateYmd}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime()) || dateYmd < today) {
      return { ok: false, added: 0, skipped: 0, error: "invalid" };
    }
  }

  let added = 0;
  let skipped = 0;
  for (const dateYmd of dates) {
    const { error } = await supabase.from("domus_agent_availability").insert({
      org_id: orgId,
      agent_profile_id: agentProfileId,
      available_date: dateYmd,
      start_time: startTime,
      end_time: endTime,
    });

    if (error) {
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      throw new Error(error.message);
    }
    added += 1;
  }

  revalidatePath("/dashboard/visitas");
  return { ok: true, added, skipped };
}

// Saca un bloque de disponibilidad propio — solo si todavía no tiene una
// visita pendiente o confirmada dentro de ese rango horario (si un
// cliente ya reservó un horario de ese bloque con este agente, borrar la
// disponibilidad no debería hacer desaparecer la visita ya agendada de la
// agenda; hay que rechazarla/cancelarla primero, desde la tabla de
// agenda). El .eq("agent_profile_id", agentProfileId) es el ownership
// check real: un agente no puede tocar la disponibilidad de otro con solo
// conocer el id (domus_agent_availability no tiene RLS, mismo criterio
// que el resto de las tablas de este proyecto).
export async function removeAvailability(id: string): Promise<{ ok: boolean; error?: "has_visit" }> {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const { data: slot } = await supabase
    .from("domus_agent_availability")
    .select("available_date, start_time, end_time")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId)
    .maybeSingle();
  if (!slot) return { ok: true };

  const { data: existingVisit } = await supabase
    .from("domus_property_visits")
    .select("id")
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId)
    .eq("visit_date", slot.available_date)
    .gte("visit_time", slot.start_time)
    .lt("visit_time", slot.end_time)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  if (existingVisit) return { ok: false, error: "has_visit" };

  await supabase
    .from("domus_agent_availability")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId);

  revalidatePath("/dashboard/visitas");
  return { ok: true };
}

// Confirma una visita pendiente — mueve status a 'confirmed'. Sigue
// bloqueada por el mismo índice parcial (WHERE status IN
// ('pending','confirmed')), así que el horario ya estaba tomado desde que
// el cliente la pidió; esto no cambia disponibilidad, solo el estado que
// ve el agente y el cliente.
export async function confirmVisit(visitId: string) {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const { error } = await supabase
    .from("domus_property_visits")
    .update({ status: "confirmed" })
    .eq("id", visitId)
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/visitas");
}

// Rechaza una visita pendiente — UPDATE status='rejected', nunca DELETE.
// El índice parcial libera el horario automáticamente (ya no matchea
// pending/confirmed), igual que cancelVisit.
export async function rejectVisit(visitId: string) {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const { error } = await supabase
    .from("domus_property_visits")
    .update({ status: "rejected" })
    .eq("id", visitId)
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/visitas");
}

// Cancela una visita propia (confirmada) — mismo patrón exacto que
// cancelAppointment en dashboard/turnos/actions.ts (Huellitas): UPDATE
// status='cancelled', nunca DELETE. El índice parcial (WHERE status IN
// ('pending','confirmed')) hace que el horario quede libre de nuevo
// automáticamente en cuanto esto corre, sin tocar la fila de
// domus_agent_availability — el agente no tiene que volver a cargar el
// bloque a mano.
export async function cancelVisit(visitId: string) {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const { error } = await supabase
    .from("domus_property_visits")
    .update({ status: "cancelled" })
    .eq("id", visitId)
    .eq("org_id", orgId)
    .eq("agent_profile_id", agentProfileId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/visitas");
}
