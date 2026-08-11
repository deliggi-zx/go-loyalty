"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LinkPetResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "already_linked" | "unauthorized" };

// Punto 3 del pedido: el dueño NUNCA busca ni elige una mascota, solo
// tipea el código. Reglas exactas pedidas:
// - código no existe -> "invalid"
// - existe pero ya tiene owner_profile_id -> "already_linked"
// - existe y no tiene dueño -> se asocia al usuario actual
// El .is("owner_profile_id", null) en el update (no solo el chequeo
// previo) cierra la ventana de carrera: si dos dueños intentan el mismo
// código casi al mismo tiempo, el update de quien llega segundo no
// afecta ninguna fila (ownerProfileId ya no es null) y se le informa
// "already_linked" en vez de pisar silenciosamente al primero.
export async function linkPetByCode(
  slug: string,
  orgId: string,
  code: string
): Promise<LinkPetResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { ok: false, error: "invalid" };

  const { data: pet } = await supabase
    .from("vet_pets")
    .select("id, owner_profile_id")
    .eq("org_id", orgId)
    .eq("link_code", normalizedCode)
    .maybeSingle();

  if (!pet) return { ok: false, error: "invalid" };
  if (pet.owner_profile_id) return { ok: false, error: "already_linked" };

  const { data: updated } = await supabase
    .from("vet_pets")
    .update({ owner_profile_id: user.id, updated_at: new Date().toISOString() })
    .eq("id", pet.id)
    .is("owner_profile_id", null)
    .select("id")
    .maybeSingle();

  if (!updated) return { ok: false, error: "already_linked" };

  revalidatePath(`/${slug}/perfil`);
  return { ok: true };
}

// Único campo editable por el dueño (punto 3): la foto. Ownership
// verificado acá — el update solo pega si owner_profile_id es el usuario
// actual, así nadie puede cambiarle la foto a una mascota que no es suya
// aunque conozca el petId (vet_pets no tiene RLS, este chequeo es la
// única barrera real).
export async function updateMyPetPhoto(petId: string, photoUrl: string, slug: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: updated, error } = await supabase
    .from("vet_pets")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", petId)
    .eq("owner_profile_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error("No autorizado a editar esta mascota.");

  revalidatePath(`/${slug}/perfil`);
}
