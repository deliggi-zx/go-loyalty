"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

const CODE_LENGTH = 8;
// Sin caracteres ambiguos (0/O, 1/I/L) para que sea fácil de leer/dictar
// por WhatsApp o en el mostrador.
const CODE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[randomInt(CODE_CHARSET.length)];
  }
  return code;
}

export async function generateInviteCode(): Promise<string> {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // Reintenta si el código generado ya choca con el UNIQUE de la tabla —
  // con 8 caracteres de un alfabeto de 31 es rarísimo, pero más barato
  // reintentar unas pocas veces que asumir que nunca va a pasar.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("gym_invite_codes")
      .insert({ org_id: orgId, code })
      .select("code")
      .single();

    if (!error) {
      revalidatePath("/dashboard/invitaciones");
      return data.code;
    }

    // 23505 = unique_violation. Cualquier otro error no tiene sentido
    // reintentarlo (ej. RLS rechazando el insert).
    if (error.code !== "23505") throw new Error(error.message);
  }

  throw new Error("No se pudo generar un código único, probá de nuevo.");
}
