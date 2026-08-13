"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canCreateCommunityPet,
  canEditCommunityPet,
  type CommunityPetType,
} from "./vet-community-pets-permissions";

function pathForType(slug: string, type: CommunityPetType) {
  return `/${slug}/${type === "refugio" ? "refugio" : "perdidos"}`;
}

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

export interface CreateCommunityPetInput {
  id: string;
  type: CommunityPetType;
  photoUrl: string;
  description: string;
}

// El id lo genera el cliente (crypto.randomUUID(), ver vet-community-
// gallery.tsx) ANTES de subir la foto — hace falta para el path fijo
// pedido (community-pets/{org_id}/{type}/{id}.jpg), así que la foto ya
// está subida a ESE id cuando se llama acá. Confiar en el id del cliente
// para el insert es seguro: en el peor caso (colisión, prácticamente
// imposible) el insert falla, no hay forma de pisar una fila ajena
// (created_by siempre es el usuario real de la sesión, nunca viaja del
// cliente).
export async function createCommunityPet(
  slug: string,
  orgId: string,
  input: CreateCommunityPetInput
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canCreateCommunityPet(input.type, role)) {
    throw new Error("No tenés permiso para cargar esta publicación.");
  }

  const description = input.description.trim();
  if (!description) throw new Error("La descripción no puede estar vacía.");

  const { error } = await supabase.from("vet_community_pets").insert({
    id: input.id,
    org_id: orgId,
    type: input.type,
    photo_url: input.photoUrl,
    description,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(pathForType(slug, input.type));
}

export interface UpdateCommunityPetInput {
  id: string;
  type: CommunityPetType;
  description: string;
  // Solo si el dueño reemplazó la foto (ver vet-community-gallery.tsx) —
  // el path es el mismo (upsert), así que técnicamente no hace falta
  // volver a guardar la URL (no cambia), pero se re-guarda igual por si
  // algún día el path deja de ser determinístico.
  photoUrl?: string;
}

export async function updateCommunityPet(
  slug: string,
  orgId: string,
  input: UpdateCommunityPetInput
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: entry } = await supabase
    .from("vet_community_pets")
    .select("id, created_by")
    .eq("id", input.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!entry) throw new Error("No encontrado.");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canEditCommunityPet(entry.created_by, user.id, role)) {
    throw new Error("No tenés permiso para editar esta publicación.");
  }

  const description = input.description.trim();
  if (!description) throw new Error("La descripción no puede estar vacía.");

  const { error } = await supabase
    .from("vet_community_pets")
    .update({
      description,
      ...(input.photoUrl ? { photo_url: input.photoUrl } : {}),
    })
    .eq("id", input.id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath(pathForType(slug, input.type));
}

export async function deleteCommunityPet(
  slug: string,
  orgId: string,
  type: CommunityPetType,
  id: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: entry } = await supabase
    .from("vet_community_pets")
    .select("id, created_by")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!entry) throw new Error("No encontrado.");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canEditCommunityPet(entry.created_by, user.id, role)) {
    throw new Error("No tenés permiso para borrar esta publicación.");
  }

  // Best-effort: si falla el borrado del archivo (ej. ya no existe), no
  // bloquea el borrado de la fila — quedar con un archivo huérfano en el
  // bucket es mucho menos grave que no poder borrar la publicación.
  await supabase.storage.from("loyalty-content").remove([`community-pets/${orgId}/${type}/${id}.jpg`]);

  const { error } = await supabase
    .from("vet_community_pets")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath(pathForType(slug, type));
}
