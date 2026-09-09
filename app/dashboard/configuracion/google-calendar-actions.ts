"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/features";
import { disconnect } from "@/lib/google-calendar-oauth";

// Desconectar el Google Calendar de la org. Solo el gerente (admin) de una
// org con la feature "google_calendar" (nivel Pro) — la conexión es única
// y compartida.
export async function disconnectGoogleCalendar(): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role, org_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "admin") return { ok: false };

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("feature_tier, feature_overrides")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (!hasFeature(org, "google_calendar")) return { ok: false };

  await disconnect(membership.org_id);
  revalidatePath("/dashboard/configuracion");
  return { ok: true };
}
