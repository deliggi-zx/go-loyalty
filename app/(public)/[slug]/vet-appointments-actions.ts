"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  generateDaySlots,
  isValidAppointmentReason,
  isVetAppointmentsClosedDay,
  todayLocalYmd,
} from "./vet-appointments-config";
import { getAvailableSlots } from "./vet-appointments-data";

// Wrapper fino sobre getAvailableSlots (vet-appointments-data.ts) — el
// paso 3 del wizard (vet-turnos-booking.tsx) es un client component y no
// puede importar ese archivo directo (usa createClient() de servidor);
// necesita un server action para volver a pedir los slots libres cada vez
// que el dueño cambia de fecha.
export async function getAvailableSlotsAction(orgId: string, dateYmd: string): Promise<string[]> {
  return getAvailableSlots(orgId, dateYmd);
}

export interface CreateAppointmentInput {
  petId: string | null;
  petNameHint: string | null;
  reason: string;
  date: string;
  time: string;
}

export interface CreateAppointmentSummary {
  petName: string;
  reason: string;
  date: string;
  time: string;
}

export type CreateAppointmentResult =
  | { ok: true; appointment: CreateAppointmentSummary }
  | { ok: false; error: "unauthorized" | "invalid" | "slot_taken" };

// Turno nuevo del dueño (paso "Confirmar" del wizard). Revalida en el
// server TODO lo que la UI ya restringe (motivo, día no domingo, horario
// de la grilla, dueño real de la mascota elegida) — mismo criterio que el
// resto de las acciones de este proyecto (ver createMedicalRecord en
// dashboard/mascotas/actions.ts): la UI limita las opciones, pero no hay
// que confiar en que el cliente mande justo lo que la UI le dejó elegir.
export async function createAppointment(
  slug: string,
  orgId: string,
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  if (!isValidAppointmentReason(input.reason)) return { ok: false, error: "invalid" };

  const parsedDate = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: "invalid" };
  if (isVetAppointmentsClosedDay(parsedDate)) return { ok: false, error: "invalid" };
  if (input.date < todayLocalYmd()) return { ok: false, error: "invalid" };

  if (!generateDaySlots().includes(input.time)) return { ok: false, error: "invalid" };

  let petName: string;

  if (input.petId) {
    // La mascota elegida tiene que ser del dueño que está pidiendo el
    // turno, no cualquier id que llegue del cliente — mismo espíritu que
    // el .eq("owner_profile_id", user.id) de updateMyPetPhoto en
    // vet-pets-actions.ts.
    const { data: pet } = await supabase
      .from("vet_pets")
      .select("id, name")
      .eq("id", input.petId)
      .eq("org_id", orgId)
      .eq("owner_profile_id", user.id)
      .maybeSingle();
    if (!pet) return { ok: false, error: "invalid" };
    petName = pet.name;
  } else {
    const hint = input.petNameHint?.trim();
    if (!hint) return { ok: false, error: "invalid" };
    petName = hint;
  }

  const { error } = await supabase.from("vet_appointments").insert({
    org_id: orgId,
    owner_profile_id: user.id,
    pet_id: input.petId,
    pet_name_hint: input.petId ? null : petName,
    reason: input.reason,
    appointment_date: input.date,
    appointment_time: input.time,
    status: "confirmed",
  });

  if (error) {
    // 23505 = unique_violation — el índice parcial de la migración
    // (WHERE status = 'confirmed') es lo que realmente evita el
    // double-booking; esto es solo traducir ese error de Postgres a un
    // resultado que la UI entiende, en vez de un error crudo de base de
    // datos.
    if (error.code === "23505") return { ok: false, error: "slot_taken" };
    throw new Error(error.message);
  }

  revalidatePath(`/${slug}/turnos`);

  return {
    ok: true,
    appointment: { petName, reason: input.reason, date: input.date, time: input.time },
  };
}
