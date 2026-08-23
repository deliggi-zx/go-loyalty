"use server";

import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { formatPrice } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export type AskDomusChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

// Fase chatbot Domus: no hay columna de "zonas que cubre" ni "horario de
// atención" en loyalty_organizations (confirmado en el Gate 0), y Domus
// no tiene about_text/whatsapp_number cargados hoy — texto genérico
// simple como fallback, no vale la pena sumar columnas nuevas para esto
// todavía. Las zonas reales se calculan de los barrios de las
// propiedades activas (más preciso que cualquier texto estático).
const FALLBACK_HOURS_TEXT = "Lunes a viernes de 9 a 18 hs, sábados de 9 a 13 hs (horario de Argentina).";

// Últimos N mensajes de historial que se mandan como contexto — alcanza
// para una conversación de chat simple sin inflar el prompt de más.
const MAX_HISTORY_MESSAGES = 8;

function specString(specs: Record<string, unknown> | null, key: string): string | null {
  const val = specs?.[key];
  return typeof val === "string" || typeof val === "number" ? String(val) : null;
}

// Turno nuevo del cliente en el chat. orgId ya alcanza para armar todo
// el contexto (org + propiedades activas) — no hace falta más que eso
// desde el cliente, todo lo demás se resuelve acá.
export async function askDomusChat(
  orgId: string,
  message: string,
  history: ChatMessage[]
): Promise<AskDomusChatResult> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return { ok: false, error: "invalid" };

  const supabase = createClient();

  const [{ data: org }, { data: productsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("loyalty_organizations")
      .select("name, about_text, whatsapp_number")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("name, price, currency, specs, category_id")
      .eq("org_id", orgId)
      .eq("active", true),
    supabase.from("product_categories").select("id, name, parent_id").eq("org_id", orgId),
  ]);

  const categoryById = new Map((categoriesData ?? []).map((c) => [c.id, c]));

  // "Operación" (Venta/Alquiler) sale de specs si está cargada, y si no,
  // de la categoría raíz del producto (mismo criterio Venta/Alquiler que
  // ya usa la Fase moneda para inferir la moneda por defecto).
  function operationFromCategory(categoryId: string | null): string | null {
    if (!categoryId) return null;
    const cat = categoryById.get(categoryId);
    if (!cat) return null;
    const root = cat.parent_id ? categoryById.get(cat.parent_id) : cat;
    return root?.name ?? null;
  }

  const properties = productsData ?? [];
  const propertiesSummary =
    properties.length > 0
      ? properties
          .map((p) => {
            const specs = (p.specs as Record<string, unknown> | null) ?? null;
            const zona = specString(specs, "barrio") ?? "zona no especificada";
            const ambientes = specString(specs, "ambientes");
            const operacion = specString(specs, "operación") ?? operationFromCategory(p.category_id) ?? "—";
            const precio = formatPrice(Number(p.price), p.currency);
            return `- ${p.name} — ${operacion}, zona ${zona}${ambientes ? `, ${ambientes} ambientes` : ""}, ${precio}`;
          })
          .join("\n")
      : "No hay propiedades activas cargadas en este momento.";

  const zonasCubiertas = Array.from(
    new Set(
      properties
        .map((p) => specString((p.specs as Record<string, unknown> | null) ?? null, "barrio"))
        .filter((z): z is string => !!z)
    )
  );

  const orgName = org?.name ?? "la inmobiliaria";
  const systemInstruction = `
Sos el asistente virtual de ${orgName}, una inmobiliaria. Respondé siempre en español rioplatense, de forma breve, cordial y directa — no más de 3-4 oraciones por respuesta.

REGLAS ESTRICTAS (nunca las rompas):
- Solo podés hablar de las propiedades y datos que te paso abajo. NUNCA inventes una propiedad, precio, característica o dato que no esté acá.
- Si te preguntan por algo que no tenés (una propiedad que no existe, un precio, una zona o una característica que no fue provista), decilo con honestidad — nunca inventes un número o un dato — y sugerí que sigan la consulta por WhatsApp o dejando un mensaje.
- Si te preguntan la DIRECCIÓN EXACTA de una propiedad (calle y altura): no la tenés cargada acá a propósito, así que nunca lo digas como si fuera un dato que te falta o una limitación tuya. Explicá que, por política de la inmobiliaria, la dirección exacta se comparte recién al coordinar una visita — así se cuida la privacidad de quien vive ahí hoy — y ofrecé ayuda para agendarla mencionando el botón "Solicitar visita" que está en la ficha de esa propiedad.
- No prometas nada que no puedas cumplir vos (agendar una visita, cerrar una operación, confirmar disponibilidad exacta) — para eso está el equipo humano.
- No dés información de ninguna otra inmobiliaria ni de ningún otro tema que no sea este negocio.

Datos de la inmobiliaria:
${org?.about_text ? `- Sobre nosotros: ${org.about_text}` : ""}
- Horario de atención: ${FALLBACK_HOURS_TEXT}
- Zonas donde tenemos propiedades hoy: ${zonasCubiertas.length > 0 ? zonasCubiertas.join(", ") : "consultar disponibilidad"}

Propiedades activas disponibles hoy:
${propertiesSummary}
`.trim();

  const contents = [
    ...history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user" as const, parts: [{ text: trimmedMessage }] },
  ];

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction },
    });

    const reply = response.text?.trim();
    if (!reply) return { ok: false, error: "empty" };

    return { ok: true, reply };
  } catch (err) {
    console.error("Error al llamar a Gemini:", err instanceof Error ? err.message : err);
    return { ok: false, error: "gemini_error" };
  }
}
