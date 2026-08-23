"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { getMorningSummaryContext, SEGUIMIENTO_STALE_DAYS } from "./domus-morning-summary-data";

// Fase Resumen matutino (Domus): si no hay nada relevante, ni vale la
// pena llamar a Gemini (pedido explícito, ahorra una llamada
// innecesaria) — mismo texto fijo que el caso "todo en cero".
const NOTHING_PENDING_TEXT = "Todo tranquilo por ahora, sin pendientes urgentes.";

// Si Gemini falla (sin key, error de red, respuesta vacía), no tiene
// sentido romper el panel entero por esto — se cae a un texto neutro,
// nunca a un mensaje de error técnico visible para el agente.
const FALLBACK_TEXT = "No pudimos armar el resumen del día, pero tu panel sigue al día más abajo.";

function formatMeeting(m: { clientName: string; time: string; kind: "reunion" | "visita" }): string {
  return `- ${m.clientName} a las ${m.time} (${m.kind === "reunion" ? "reunión" : "visita"})`;
}

// Server action llamada desde DomusAgentPanel (client component) al
// montar — arma el contexto real (mismas tablas/criterios que
// domus-badge-counts.ts y /dashboard/inicio/{consultas,reuniones,
// seguimiento}, ver Gate 0) y le pide a Gemini un resumen corto. Nunca
// tira: cualquier error cae al texto fijo de arriba.
export async function getMorningSummary(orgId: string): Promise<string> {
  const ctx = await getMorningSummaryContext(orgId);

  const isEmpty =
    ctx.newInquiries.length === 0 &&
    ctx.meetingsToday.length === 0 &&
    ctx.staleFollowUps.length === 0;
  if (isEmpty) return NOTHING_PENDING_TEXT;

  const inquiriesText =
    ctx.newInquiries.length > 0
      ? ctx.newInquiries.map((i) => `- "${i.message}"`).join("\n")
      : "Ninguna.";
  const meetingsText =
    ctx.meetingsToday.length > 0 ? ctx.meetingsToday.map(formatMeeting).join("\n") : "Ninguna.";
  const staleText =
    ctx.staleFollowUps.length > 0
      ? ctx.staleFollowUps.map((s) => `- ${s.clientName}, sin novedades hace ${s.daysSince} días`).join("\n")
      : "Ninguno.";

  const prompt = `
Datos reales de hoy para un agente inmobiliario (Domus):

Consultas nuevas sin responder (${ctx.newInquiries.length}):
${inquiriesText}

Reuniones/visitas agendadas para hoy (${ctx.meetingsToday.length}):
${meetingsText}

Clientes en seguimiento sin novedades hace más de ${SEGUIMIENTO_STALE_DAYS} días (${ctx.staleFollowUps.length}):
${staleText}

Escribí un resumen breve (2 a 4 oraciones), en tono cálido pero profesional, dirigido directamente al agente (ej. "Tenés...", "Te esperan..."). Usá SOLO estos datos reales — no inventes nombres, propiedades, cifras ni detalles que no estén acá. Si hay varias cosas del mismo tipo, podés agruparlas en vez de listarlas una por una. No hace falta un saludo ni un cierre, andá directo al resumen.
`.trim();

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = response.text?.trim();
    return text || FALLBACK_TEXT;
  } catch (err) {
    console.error("Error al generar el resumen matutino:", err instanceof Error ? err.message : err);
    return FALLBACK_TEXT;
  }
}
