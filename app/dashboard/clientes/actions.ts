"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { awardPoints } from "@/lib/loyalty/award-points";
import { isLoyaltyManualType, loyaltyTypeLabel } from "@/lib/loyalty/config";

export interface AddManualPointsInput {
  customerId: string;
  type: string; // LoyaltyManualType
  amount: number;
  // Detalle libre: obligatorio para "manual_adjustment", opcional para el
  // resto (se antepone al label del tipo en la nota del movimiento).
  detail?: string;
}

export interface AddManualPointsResult {
  ok: boolean;
  error?: string;
}

// Carga manual de puntos desde la ficha del cliente (visitas presenciales,
// cierre de operaciones, referidos, reseñas, ajustes). El monto ya viene
// resuelto y editado a mano por el admin en el form; acá solo se valida y
// se acredita.
export async function addManualPoints(
  input: AddManualPointsInput
): Promise<AddManualPointsResult> {
  const { customerId, type, amount, detail } = input;

  if (!isLoyaltyManualType(type)) {
    return { ok: false, error: "Motivo inválido." };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "El monto tiene que ser un número entero mayor a 0." };
  }
  if (type === "manual_adjustment" && !detail?.trim()) {
    return { ok: false, error: "Escribí el motivo del ajuste." };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado." };

  const orgId = await getOrgId();
  if (!orgId) return { ok: false, error: "No autorizado." };

  // El que carga tiene que ser staff (cualquier rol menos customer) de esta org.
  const { data: caller } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!caller || caller.role === "customer") {
    return { ok: false, error: "No autorizado." };
  }

  // El cliente tiene que ser customer de ESTA org.
  const { data: target } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", customerId)
    .maybeSingle();
  if (target?.role !== "customer") {
    return { ok: false, error: "El cliente no pertenece a esta organización." };
  }

  const cleanDetail = detail?.trim();
  const note = cleanDetail
    ? `${loyaltyTypeLabel(type)} — ${cleanDetail}`
    : loyaltyTypeLabel(type);

  try {
    await awardPoints({
      orgId,
      profileId: customerId,
      amount,
      type,
      note,
      createdBy: user.id,
    });
  } catch (err) {
    console.error("[clientes] addManualPoints falló:", err);
    return { ok: false, error: "No se pudieron acreditar los puntos. Probá de nuevo." };
  }

  revalidatePath(`/dashboard/clientes/${customerId}`);
  revalidatePath("/dashboard/clientes");
  return { ok: true };
}
