"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";

// Fase T1 "Mundo Bike" Taller: mismo criterio de auth que requireAgent en
// dashboard/visitas/actions.ts, sin agent_profile_id — la disponibilidad
// es del local, no de una persona. El control de que sea admin de bike
// (no cualquier org) ya lo hace taller/page.tsx al gatear el render de
// esta pantalla; acá solo hace falta una org real detrás de la sesión.
async function requireOrgContext() {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  return { supabase, orgId };
}

export interface AddAvailabilityRangeResult {
  ok: boolean;
  added: number;
  skipped: number;
  error?: "invalid";
}

// Mismo mecanismo que addAvailabilityRange en dashboard/visitas/actions.ts
// (Domus): un rango Desde/Hasta aplicado a todos los días tildados, una
// fila por día, insertada de a una para que un día ya cargado con ese
// mismo rango exacto (23505, choca con bike_workshop_availability_range_
// unique) no aborte el resto del lote — se cuenta como "salteado".
export async function addAvailabilityRange(
  dates: string[],
  startTime: string,
  endTime: string
): Promise<AddAvailabilityRangeResult> {
  const { supabase, orgId } = await requireOrgContext();

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
    const { error } = await supabase.from("bike_workshop_availability").insert({
      org_id: orgId,
      date: dateYmd,
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

  revalidatePath("/dashboard/taller");
  return { ok: true, added, skipped };
}

// Saca un bloque de disponibilidad — solo si todavía no tiene un turno
// pendiente o confirmado dentro de ese rango horario (mismo criterio de
// removeAvailability en dashboard/visitas/actions.ts: no hacer
// desaparecer un turno ya agendado de encima de la agenda). En esta fase
// (T1) bike_workshop_appointments todavía no recibe inserts reales — la
// reserva del cliente es la Fase T2 — así que hoy este chequeo siempre
// deja pasar el borrado, pero queda armado desde ya para cuando exista.
export async function removeAvailability(id: string): Promise<{ ok: boolean; error?: "has_appointment" }> {
  const { supabase, orgId } = await requireOrgContext();

  const { data: slot } = await supabase
    .from("bike_workshop_availability")
    .select("date, start_time, end_time")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!slot) return { ok: true };

  const { data: existingAppointment } = await supabase
    .from("bike_workshop_appointments")
    .select("id")
    .eq("org_id", orgId)
    .eq("date", slot.date)
    .gte("start_time", slot.start_time)
    .lt("start_time", slot.end_time)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  if (existingAppointment) return { ok: false, error: "has_appointment" };

  await supabase.from("bike_workshop_availability").delete().eq("id", id).eq("org_id", orgId);

  revalidatePath("/dashboard/taller");
  return { ok: true };
}
