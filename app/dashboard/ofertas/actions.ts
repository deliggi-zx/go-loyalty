"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Tres acciones simples de cambio de estado, ninguna automática (pedido
// explícito) — "sumada al stock" NO crea el producto en el catálogo solo,
// el agente lo carga de nuevo a mano en /dashboard/catalogo/productos/
// nuevo usando esta oferta como referencia visual. Mismo criterio de
// ownership (.eq("org_id", orgId), sin RLS) que markInquiryContacted/
// markInquiryClosed en dashboard/consultas/actions.ts.
async function updateOfferStatus(id: string, status: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_property_offers")
    .update({ status })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ofertas");
}

export async function markOfferStock(id: string) {
  await updateOfferStatus(id, "sumado_al_stock");
}

// Fase 4a: a diferencia de las otras dos, esta pide fecha/hora primero
// (input simple en el form, ver ofertas-manager.tsx) — se guarda en
// scheduled_at además de cambiar el status, para que Reuniones (Fase 4b)
// tenga de qué ordenar.
export async function markOfferMeeting(id: string, scheduledAt: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_property_offers")
    .update({ status: "reunion_agendada", scheduled_at: scheduledAt })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ofertas");
}

export async function markOfferFollowup(id: string) {
  await updateOfferStatus(id, "seguimiento");
}
