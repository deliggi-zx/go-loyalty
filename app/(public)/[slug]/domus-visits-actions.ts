"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd } from "./vet-appointments-config";
import { getAvailableVisitSlots } from "./domus-visits-data";

// Fase 1 Domus: turnos de visita a propiedad. Reusa todayLocalYmd() de
// Huellitas (vet-appointments-config.ts) a propósito — es un helper 100%
// genérico ("hoy" en fecha local, sin corrimiento de UTC), no algo
// específico del rubro veterinaria, no tiene sentido duplicarlo acá.

// Wrapper fino sobre getAvailableVisitSlots, mismo motivo que
// getAvailableSlotsAction en vet-appointments-actions.ts: el picker de
// fecha/hora (property-visit-booking.tsx) es un client component y
// necesita volver a pedir los horarios libres cada vez que el cliente
// cambia de fecha.
export async function getAvailableVisitSlotsAction(orgId: string, dateYmd: string): Promise<string[]> {
  return getAvailableVisitSlots(orgId, dateYmd);
}

export interface CreatePropertyVisitInput {
  productId: string;
  date: string;
  time: string;
  phone: string;
}

export interface CreatePropertyVisitSummary {
  propertyName: string;
  date: string;
  time: string;
}

export type CreatePropertyVisitResult =
  | { ok: true; visit: CreatePropertyVisitSummary }
  | { ok: false; error: "unauthorized" | "invalid" | "slot_taken" };

// Turno nuevo del cliente desde la ficha de la propiedad. A diferencia de
// createAppointment (Huellitas), acá el cliente no elige agente — elige
// un horario de la lista unificada (getAvailableVisitSlots) y esta acción
// decide CUÁL agente de los que ofrecen ese horario se lo lleva (el que
// lo cargó hace más tiempo, simple orden por created_at). El unique index
// parcial por agente (domus_property_visits_agent_slot_unique) sigue
// siendo la protección real contra doble-booking — esto de acá es solo
// para no ofrecerle al cliente un agente ya tomado en el camino feliz.
export async function createPropertyVisit(
  slug: string,
  orgId: string,
  input: CreatePropertyVisitInput
): Promise<CreatePropertyVisitResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsedDate = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: "invalid" };
  if (input.date < todayLocalYmd()) return { ok: false, error: "invalid" };
  if (!/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "invalid" };

  // Dato suelto por formulario (columna nueva en domus_property_visits,
  // no en profiles — ver migración add_phone_to_domus_forms): requerido.
  const trimmedPhone = input.phone.trim();
  if (!trimmedPhone) return { ok: false, error: "invalid" };

  // La propiedad tiene que ser real y de esta org — mismo espíritu que
  // el .eq("org_id", orgId) de getProductDetail en data.ts.
  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", input.productId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!product) return { ok: false, error: "invalid" };

  // Candidatos: agentes que ofrecen ese día+hora, menos los que ya tienen
  // una visita confirmada exactamente ahí (mismo cruce en dos pasadas que
  // getAvailableVisitSlots, ver comentario ahí sobre por qué no es un
  // NOT EXISTS de SQL). Se ordena por created_at para repartir de forma
  // simple y determinística entre agentes que ofrecen el mismo horario.
  const { data: availabilityData } = await supabase
    .from("domus_agent_availability")
    .select("agent_profile_id, created_at")
    .eq("org_id", orgId)
    .eq("available_date", input.date)
    .eq("available_time", input.time)
    .order("created_at", { ascending: true });

  const candidates = availabilityData ?? [];
  if (candidates.length === 0) return { ok: false, error: "slot_taken" };

  const { data: takenData } = await supabase
    .from("domus_property_visits")
    .select("agent_profile_id")
    .eq("org_id", orgId)
    .eq("visit_date", input.date)
    .eq("visit_time", input.time)
    .eq("status", "confirmed");

  const takenAgentIds = new Set((takenData ?? []).map((v) => v.agent_profile_id));
  const agentId = candidates.find((c) => !takenAgentIds.has(c.agent_profile_id))?.agent_profile_id;
  if (!agentId) return { ok: false, error: "slot_taken" };

  const { error } = await supabase.from("domus_property_visits").insert({
    org_id: orgId,
    product_id: input.productId,
    client_profile_id: user.id,
    agent_profile_id: agentId,
    visit_date: input.date,
    visit_time: input.time,
    phone: trimmedPhone,
    status: "confirmed",
  });

  if (error) {
    // 23505 = unique_violation — el índice parcial por agente es lo que
    // realmente evita el double-booking (ver migración
    // add_domus_property_visits); esto solo cubre la ventana de carrera
    // entre el chequeo de arriba y este insert, mismo criterio que
    // createAppointment en vet-appointments-actions.ts.
    if (error.code === "23505") return { ok: false, error: "slot_taken" };
    throw new Error(error.message);
  }

  revalidatePath(`/${slug}/producto/${input.productId}`);
  revalidatePath("/dashboard/visitas");

  return {
    ok: true,
    visit: { propertyName: product.name, date: input.date, time: input.time },
  };
}

// Fase 5: cancelación del lado del CLIENTE — mismo UPDATE
// status='cancelled' exacto que cancelVisit en dashboard/visitas/
// actions.ts (nunca DELETE, el índice parcial WHERE status='confirmed'
// libera el horario automáticamente), pero acá el ownership check es
// .eq("client_profile_id", ...) en vez de agent_profile_id — es la otra
// mitad de la misma relación, no la misma función (un cliente no tiene
// forma de pasar por requireAgent()).
export async function cancelVisitAsClient(slug: string, visitId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("domus_property_visits")
    .update({ status: "cancelled" })
    .eq("id", visitId)
    .eq("client_profile_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}/perfil`);
  revalidatePath("/dashboard/visitas");
}
