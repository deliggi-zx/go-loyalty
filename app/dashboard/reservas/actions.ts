"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Confirma una reserva pendiente — pasa a 'confirmada', y la propiedad
// queda marcada como reservada en el catálogo (ver isProductReserved/
// getReservedProductIds en domus-reservations-data.ts, que leen
// directamente esta tabla — no hay nada más que actualizar).
export async function confirmReservation(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_property_reservations")
    .update({ status: "confirmada" })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("status", "pendiente_confirmacion");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/reservas");
}

// Rechaza una reserva pendiente — pasa a 'rechazada'. El índice único
// parcial (WHERE status IN ('pendiente_confirmacion','confirmada')) ya
// no la cuenta como activa apenas esto corre, así que la propiedad queda
// disponible para que cualquiera la reserve de nuevo, sin tocar nada más.
export async function rejectReservation(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_property_reservations")
    .update({ status: "rechazada" })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("status", "pendiente_confirmacion");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/reservas");
}
