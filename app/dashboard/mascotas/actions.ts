"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Sin 0/O ni 1/I a propósito (pedido explícito) — se prestan a confusión
// al leerlos o escribirlos a mano, que es exactamente cómo circula este
// código (el vet se lo dicta al dueño de palabra o por WhatsApp).
const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LINK_CODE_LENGTH = 8;

function generateLinkCode(): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += LINK_CODE_ALPHABET[Math.floor(Math.random() * LINK_CODE_ALPHABET.length)];
  }
  return code;
}

export interface PetPayload {
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  weight: number | null;
  birth_date: string | null;
  owner_profile_id: string | null;
}

// vet_pets no tiene RLS (mismo criterio que gym_courts, ver actions.ts de
// canchas) — org_id sale de getOrgId() del lado del server, nunca del
// cliente. El link_code se genera acá (nunca lo manda el cliente) con
// reintento ante colisión: con un alfabeto de 32 símbolos y 8 posiciones
// (32^8 combinaciones) una colisión real es rarísima, pero la unique
// constraint de la tabla la detecta (error.code 23505) y se reintenta con
// un código nuevo en vez de fallar de una.
export async function createPet(payload: PetPayload): Promise<{ id: string; link_code: string }> {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const linkCode = generateLinkCode();
    const { data, error } = await supabase
      .from("vet_pets")
      .insert({
        org_id: orgId,
        owner_profile_id: payload.owner_profile_id,
        link_code: linkCode,
        name: payload.name,
        species: payload.species,
        breed: payload.breed,
        color: payload.color,
        weight: payload.weight,
        birth_date: payload.birth_date,
        created_by: user.id,
      })
      .select("id, link_code")
      .single();

    if (!error) {
      revalidatePath("/dashboard/mascotas");
      return data;
    }

    // 23505 = unique_violation en Postgres — solo en ese caso vale la pena
    // reintentar con un código nuevo; cualquier otro error es real y corta.
    if (error.code !== "23505" || attempt === maxAttempts) {
      throw new Error(error.message);
    }
  }

  // Inalcanzable (el loop siempre retorna o tira), pero TS pide un
  // return/throw al final de la función.
  throw new Error("No se pudo generar un código único, probá de nuevo.");
}

export async function updatePet(petId: string, payload: PetPayload) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("vet_pets")
    .update({
      owner_profile_id: payload.owner_profile_id,
      name: payload.name,
      species: payload.species,
      breed: payload.breed,
      color: payload.color,
      weight: payload.weight,
      birth_date: payload.birth_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", petId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/mascotas");
}
