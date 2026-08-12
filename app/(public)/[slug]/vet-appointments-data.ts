import { createClient } from "@/lib/supabase/server";
import { generateDaySlots, isVetAppointmentsClosedDay } from "./vet-appointments-config";

// Lista liviana para el selector de mascota del paso 1 — a diferencia de
// getOwnerPets (vet-pets-data.ts), acá no hace falta ni species/breed/foto
// ni el historial clínico, solo lo mínimo para elegir "para cuál mascota
// es este turno". Función propia en vez de reusar getOwnerPets para no
// pagar esas queries de más en esta pantalla.
export interface OwnerPetOption {
  id: string;
  name: string;
}

export async function getOwnerPetOptions(orgId: string, profileId: string): Promise<OwnerPetOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vet_pets")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("owner_profile_id", profileId)
    .order("name", { ascending: true });

  return data ?? [];
}

// Slots libres de un día puntual: arranca de la grilla completa
// (generateDaySlots) y le resta lo que ya está reservado con
// status='confirmed' ese día. El filtro por status en la query (no un
// .filter() después en JS) es a propósito — un turno cancelado no debe
// "ocupar" el horario acá, coherente con el unique index parcial de la
// migración (WHERE status = 'confirmed').
//
// Domingo cerrado: devuelve [] directo, sin pegarle a la base — no hay
// grilla que ofrecer ese día.
export async function getAvailableSlots(orgId: string, dateYmd: string): Promise<string[]> {
  const parsedDate = new Date(`${dateYmd}T00:00:00`);
  if (isVetAppointmentsClosedDay(parsedDate)) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("vet_appointments")
    .select("appointment_time")
    .eq("org_id", orgId)
    .eq("appointment_date", dateYmd)
    .eq("status", "confirmed");

  // appointment_time vuelve de Postgres como "HH:MM:SS" — se recorta a
  // "HH:MM" para que calce con el formato que usa generateDaySlots() y
  // el resto de la app (ver vet-appointments-config.ts).
  const taken = new Set((data ?? []).map((r) => r.appointment_time.slice(0, 5)));

  return generateDaySlots().filter((slot) => !taken.has(slot));
}
