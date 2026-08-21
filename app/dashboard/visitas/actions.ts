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

export interface AddAvailabilityResult {
  ok: boolean;
  error?: "invalid" | "duplicate";
}

// Carga un bloque de disponibilidad propio. Sin grilla fija (a diferencia
// de Huellitas): cualquier fecha futura, cualquier horario — el agente
// decide, no el sistema (ver Fase 1 Domus en el pedido original). El
// unique (org_id, agent_profile_id, available_date, available_time) de la
// migración es la protección real contra cargar el mismo bloque dos
// veces; esto solo traduce ese 23505 a un resultado legible.
export async function addAvailability(dateYmd: string, timeHm: string): Promise<AddAvailabilityResult> {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const parsedDate = new Date(`${dateYmd}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime()) || dateYmd < todayLocalYmd()) {
    return { ok: false, error: "invalid" };
  }
  if (!/^\d{2}:\d{2}$/.test(timeHm)) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("domus_agent_availability").insert({
    org_id: orgId,
    agent_profile_id: agentProfileId,
    available_date: dateYmd,
    available_time: timeHm,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/visitas");
  return { ok: true };
}

// Saca un bloque de disponibilidad propio — solo si todavía no tiene una
// visita confirmada encima (si un cliente ya reservó justo ese día/hora
// con este agente, borrar la disponibilidad no debería hacer desaparecer
// la visita ya agendada de la agenda; hay que cancelar la visita primero,
// desde la tabla de agenda). El .eq("agent_profile_id", agentProfileId)
// es el ownership check real: un agente no puede tocar la disponibilidad
// de otro con solo conocer el id (domus_agent_availability no tiene RLS,
// mismo criterio que el resto de las tablas de este proyecto).
export async function removeAvailability(id: string): Promise<{ ok: boolean; error?: "has_visit" }> {
  const { supabase, orgId, agentProfileId } = await requireAgent();

  const { data: slot } = await supabase
    .from("domus_agent_availability")
    .select("available_date, available_time")
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
    .eq("visit_time", slot.available_time)
    .eq("status", "confirmed")
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

// Cancela una visita propia — mismo patrón exacto que cancelAppointment
// en dashboard/turnos/actions.ts (Huellitas): UPDATE status='cancelled',
// nunca DELETE. El índice parcial (WHERE status='confirmed') hace que el
// horario quede libre de nuevo automáticamente en cuanto esto corre, sin
// tocar la fila de domus_agent_availability — el agente no tiene que
// volver a cargar el bloque a mano.
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
