"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

export interface CourtPayload {
  name: string;
  court_type: "f5" | "f7" | "f11";
  photo_url: string | null;
}

// gym_courts no tiene RLS (mismo criterio que gym_class_schedule /
// gym_member_classes, ver comentario de la tabla) — org_id siempre sale
// de getOrgId() del lado del server, nunca del cliente, así que no hay
// forma de que alguien escriba canchas de otra organización desde acá.
export async function createCourt(payload: CourtPayload) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase.from("gym_courts").insert({
    org_id: orgId,
    name: payload.name,
    court_type: payload.court_type,
    photo_url: payload.photo_url,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/canchas");
}

export async function updateCourt(courtId: string, payload: CourtPayload) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("gym_courts")
    .update({
      name: payload.name,
      court_type: payload.court_type,
      photo_url: payload.photo_url,
    })
    .eq("id", courtId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/canchas");
}

export async function deleteCourt(courtId: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("gym_courts")
    .delete()
    .eq("id", courtId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/canchas");
}
