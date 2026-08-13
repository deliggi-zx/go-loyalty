"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Único cambio de estado posible desde el panel (punto 4): cancelar. El
// .eq("org_id", orgId) es el ownership check real acá — vet_appointments
// no tiene RLS, mismo criterio que el resto de las tablas de este
// proyecto — así que sin esto, cualquiera con el panel abierto podría
// cancelar turnos de otra org con solo conocer el id. Cancelar libera el
// horario automáticamente: el unique index parcial de la migración es
// WHERE status = 'confirmed', así que en cuanto esta fila deja de estar
// 'confirmed' el slot vuelve a quedar disponible para otro dueño.
export async function cancelAppointment(appointmentId: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("vet_appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/turnos");
}
