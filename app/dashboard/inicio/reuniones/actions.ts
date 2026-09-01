"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tryCreateCalendarEvent } from "@/lib/google-calendar-oauth";

const ALLOWED_ROLES = ["admin", "agente"];

export interface CreateMeetingInput {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  notes: string;
}

export type CreateMeetingResult =
  | { ok: true; synced: boolean }
  | { ok: false; error: "unauthorized" | "invalid" };

// Reunión cargada a mano por el equipo (cualquier tipo). Se guarda SIEMPRE
// en kapusta_meetings; si además hay un Google Calendar conectado, se
// espeja ahí — y si Google falla, la reunión queda igual, marcada como no
// sincronizada (el calendario es un espejo, no la fuente de verdad).
export async function createKapustaMeeting(
  input: CreateMeetingInput
): Promise<CreateMeetingResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role, org_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return { ok: false, error: "unauthorized" };
  }

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (org?.slug !== "kapusta") return { ok: false, error: "unauthorized" };

  const title = input.title.trim();
  const location = input.location.trim();
  const notes = input.notes.trim();
  if (!title) return { ok: false, error: "invalid" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    return { ok: false, error: "invalid" };
  }
  if (!/^\d{2}:\d{2}$/.test(input.time)) return { ok: false, error: "invalid" };

  const { data: inserted, error } = await supabase
    .from("kapusta_meetings")
    .insert({
      org_id: membership.org_id,
      created_by: user.id,
      title,
      meeting_date: input.date,
      meeting_time: input.time,
      location: location || null,
      notes: notes || null,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "No se pudo guardar la reunión");

  // Espejo en Google Calendar — nunca lanza; null si no hay conexión o falló.
  const eventId = await tryCreateCalendarEvent(membership.org_id, {
    title,
    date: input.date,
    time: input.time,
    description: notes || undefined,
    location: location || undefined,
  });

  if (eventId) {
    await supabase
      .from("kapusta_meetings")
      .update({ google_event_id: eventId, google_synced: true })
      .eq("id", inserted.id);
  }

  revalidatePath("/dashboard/inicio/reuniones");
  revalidatePath("/dashboard/inicio");

  return { ok: true, synced: Boolean(eventId) };
}
