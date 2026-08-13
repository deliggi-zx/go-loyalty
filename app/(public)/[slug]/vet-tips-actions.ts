"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageVetTips } from "./vet-tips-permissions";

async function getCurrentRole(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  userId: string
) {
  const { data } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export interface CreateVetTipInput {
  title: string;
  body: string;
}

// Crear y borrar comparten el mismo chequeo (canManageVetTips) — a
// diferencia de Refugio/Perdidos acá no hace falta distinguir "el que lo
// creó" porque el contenido es institucional, no de un dueño puntual.
export async function createVetTip(slug: string, orgId: string, input: CreateVetTipInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canManageVetTips(role)) {
    throw new Error("No tenés permiso para publicar un consejo.");
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("El título no puede estar vacío.");
  if (!body) throw new Error("El texto no puede estar vacío.");

  const { error } = await supabase.from("vet_tips").insert({
    org_id: orgId,
    title,
    body,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}/consejos`);
}

export async function deleteVetTip(slug: string, orgId: string, id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canManageVetTips(role)) {
    throw new Error("No tenés permiso para borrar este consejo.");
  }

  const { error } = await supabase.from("vet_tips").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}/consejos`);
}
