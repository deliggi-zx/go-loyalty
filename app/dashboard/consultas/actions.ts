"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Dos acciones simples, nada más elaborado en esta fase (pedido
// explícito) — marcar Contactado o Cerrado. Cualquier agente de la org
// puede tomar cualquier consulta (no está atada a un agente puntual como
// las visitas), así que el único ownership check real es
// .eq("org_id", orgId) — mismo criterio que cancelAppointment en
// dashboard/turnos/actions.ts (Huellitas): domus_general_inquiries no
// tiene RLS.
export async function markInquiryContacted(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_general_inquiries")
    .update({ status: "contactado" })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/consultas");
}

export async function markInquiryClosed(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_general_inquiries")
    .update({ status: "cerrado" })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/consultas");
}

// Fase filtros de consultas: tema opcional, lo asigna el agente al leer
// la consulta (nunca el cliente al enviarla) — no bloquea nada, se puede
// asignar o reasignar en cualquier momento. Mismo ownership check que
// las dos de arriba (.eq("org_id", orgId), la tabla no tiene RLS).
export async function setInquiryTopic(id: string, topic: "compra" | "alquiler" | "desarrollo") {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("domus_general_inquiries")
    .update({ topic })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/consultas");
}
