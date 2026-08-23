"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";

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

// ── Fase 1c (rol agente): asignación de consultas ───────────────────────────

// El agente toma una consulta SIN asignar — self-assign a su propio
// profile_id (nunca un id que mande el cliente, sale de la sesión). El
// .is("assigned_agent_id", null) es el único guard que hace falta: si
// otro agente se la llevó un instante antes, este update no matchea
// ninguna fila y no pasa nada (nadie se la "roba" a otro agente). Mismo
// criterio .eq("org_id", orgId) que el resto de este archivo — la tabla
// no tiene RLS.
export async function takeInquiry(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { error } = await supabase
    .from("domus_general_inquiries")
    .update({ assigned_agent_id: user.id })
    .eq("id", id)
    .eq("org_id", orgId)
    .is("assigned_agent_id", null);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/consultas");
  revalidatePath("/dashboard/inicio/consultas");
}

// El gerente (role admin) asigna o reasigna manualmente cualquier
// consulta a cualquier agente, en cualquier momento — a diferencia de
// takeInquiry arriba, no exige que esté sin asignar. targetProfileId
// null = "Sin asignar" (desasignar). A diferencia del resto de las
// acciones de este archivo (que solo chequean org_id, la tabla no tiene
// RLS), acá SÍ se valida el rol de quien llama — reasignar el trabajo de
// otro agente es más sensible que marcar un estado propio, y se valida
// que el destino sea un miembro real de la org (agente o admin) para no
// guardar un profile_id arbitrario.
export async function assignInquiryAgent(id: string, targetProfileId: string | null) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: callerMembership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (callerMembership?.role !== "admin") throw new Error("No autorizado");

  if (targetProfileId) {
    const { data: target } = await supabase
      .from("loyalty_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("profile_id", targetProfileId)
      .maybeSingle();
    if (!target || (target.role !== "agente" && target.role !== "admin")) {
      throw new Error("Agente inválido");
    }
  }

  const { error } = await supabase
    .from("domus_general_inquiries")
    .update({ assigned_agent_id: targetProfileId })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/consultas");
  revalidatePath("/dashboard/inicio/consultas");
}

// ── Borrador de respuesta asistido (Fase B) ─────────────────────────────────

export type SuggestInquiryReplyResult =
  | { ok: true; draft: string }
  | { ok: false; error: "not_found" | "empty" | "gemini_error" };

const TOPIC_LABEL: Record<string, string> = {
  compra: "compra",
  alquiler: "alquiler",
  desarrollo: "desarrollo/inversión",
};

// Borrador de WhatsApp para responder UNA consulta puntual — mismo
// criterio "estricto con los datos" que askDomusChat (domus-chat-
// actions.ts): solo se le pasa a Gemini el mensaje real de la consulta +
// el tema si tiene asignado + nombre de la org, nunca precios ni
// propiedades inventadas. Mismo ownership check (.eq("org_id", orgId))
// que el resto de las acciones de este archivo.
export async function suggestInquiryReply(id: string): Promise<SuggestInquiryReplyResult> {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const [{ data: inquiry }, { data: org }] = await Promise.all([
    supabase
      .from("domus_general_inquiries")
      .select("message, topic")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle(),
    // whatsapp_number no se cita en el prompt (el borrador YA es el
    // mensaje de WhatsApp de la inmobiliaria hacia el cliente, no tiene
    // sentido que se autorreferencie su propio número) — se trae igual
    // por si el día de mañana hace falta ("respondé desde nuestro
    // WhatsApp oficial", etc.), mismo criterio de "contexto básico" que
    // pidió la fase.
    supabase.from("loyalty_organizations").select("name, whatsapp_number").eq("id", orgId).maybeSingle(),
  ]);

  if (!inquiry) return { ok: false, error: "not_found" };

  const topicLine = inquiry.topic
    ? `Tema que el agente ya le asignó a esta consulta: ${TOPIC_LABEL[inquiry.topic] ?? inquiry.topic}.`
    : "";

  const prompt = `
Sos un agente inmobiliario de ${org?.name ?? "la inmobiliaria"} redactando un mensaje de WhatsApp para responderle a un cliente.

Consulta del cliente:
"${inquiry.message}"
${topicLine}

Escribí un borrador de respuesta corto (2 a 4 oraciones), profesional pero cálido, en español rioplatense, listo para pegar directo en WhatsApp. Tiene que:
- Responder concretamente lo que el cliente preguntó, usando SOLO la información de la consulta de arriba — nunca inventes datos de propiedades, precios, zonas ni disponibilidad que no te dieron.
- Ofrecer un siguiente paso claro (coordinar una visita, pedirle más datos para asesorarlo mejor, etc.), sin prometer nada que no puedas cumplir.
- Arrancar directo, sin un saludo tipo "Estimado/a" — un tono natural y cercano.
Devolvé SOLO el texto del mensaje, sin comillas ni encabezados ni explicaciones.
`.trim();

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const draft = response.text?.trim();
    if (!draft) return { ok: false, error: "empty" };
    return { ok: true, draft };
  } catch (err) {
    console.error("Error al sugerir respuesta:", err instanceof Error ? err.message : err);
    return { ok: false, error: "gemini_error" };
  }
}
