"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd } from "./vet-appointments-config";
import { getAvailableWorkshopDays, isWorkshopSlotAvailable, type WorkshopAvailableDay } from "./bike-workshop-data";

// Fase T2 "Mundo Bike" Taller: wrapper fino sobre getAvailableWorkshopDays
// — el picker (workshop-booking.tsx) es un client component y necesita
// poder volver a pedir los slots libres (ej. después de un "ya no hay
// cupo" al confirmar), mismo motivo que getAvailableVisitSlotsAction en
// Domus.
export async function getAvailableWorkshopDaysAction(
  orgId: string,
  capacityPerSlot: number
): Promise<WorkshopAvailableDay[]> {
  return getAvailableWorkshopDays(orgId, capacityPerSlot);
}

export type CreateWorkshopAppointmentResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid" | "slot_taken" };

// Turno nuevo del cliente. Requiere sesión, vuelve a chequear capacidad
// AL MOMENTO de insertar (isWorkshopSlotAvailable, no confía en lo que se
// mostró en pantalla — pudo cambiar entre que el cliente cargó la vista
// y confirmó). Sin índice de exclusión en base (ver Fase T1 / Gate 1 de
// esta fase): la ventana entre el chequeo y el insert queda como riesgo
// menor aceptado, documentado como deuda técnica de fase de maqueta —
// en el peor caso dos clientes confirman "a la vez" el mismo último
// cupo y uno de los dos termina con un turno de más ahí; no hay
// mecanismo de reintento automático para esa ventana en esta fase.
export async function createWorkshopAppointment(
  slug: string,
  orgId: string,
  capacityPerSlot: number,
  date: string,
  startTime: string,
  description: string
): Promise<CreateWorkshopAppointmentResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: "invalid" };
  if (date < todayLocalYmd()) return { ok: false, error: "invalid" };
  if (!/^\d{2}:\d{2}$/.test(startTime)) return { ok: false, error: "invalid" };

  const trimmedDescription = description.trim();
  if (!trimmedDescription) return { ok: false, error: "invalid" };

  const available = await isWorkshopSlotAvailable(orgId, date, startTime, capacityPerSlot);
  if (!available) return { ok: false, error: "slot_taken" };

  const { error } = await supabase.from("bike_workshop_appointments").insert({
    org_id: orgId,
    profile_id: user.id,
    date,
    start_time: startTime,
    description: trimmedDescription,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}/taller`);
  revalidatePath("/dashboard/taller");

  return { ok: true };
}

// Fase T3: cancelación del lado del CLIENTE — mismo UPDATE
// status='cancelled' exacto que cancelVisitAsClient en domus-visits-
// actions.ts (nunca DELETE), ownership check con .eq("profile_id", ...).
// El conteo de capacidad (isWorkshopSlotAvailable/getAvailableWorkshopDays
// en bike-workshop-data.ts) ya solo cuenta pending+confirmed, así que el
// horario queda libre automáticamente, sin tocar bike_workshop_
// availability.
export async function cancelWorkshopAppointmentAsClient(slug: string, appointmentId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("bike_workshop_appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("profile_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}/taller`);
  revalidatePath("/dashboard/taller");
}
