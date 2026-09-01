"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { disconnect } from "@/lib/google-calendar-oauth";

// Desconectar el Google Calendar de la org. Solo gerente (admin) de
// Kapusta — la conexión es única y compartida.
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
    .select("slug")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (org?.slug !== "kapusta") return { ok: false };

  await disconnect(membership.org_id);
  revalidatePath("/dashboard/configuracion");
  return { ok: true };
}
