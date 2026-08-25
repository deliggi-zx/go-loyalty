"use server";

import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { formatPrice } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export type AskBikeChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

// Últimos N mensajes de historial que se mandan como contexto — mismo
// criterio que domus-chat-actions.ts (Fase 5 Domus): alcanza para una
// conversación de chat simple sin inflar el prompt de más.
const MAX_HISTORY_MESSAGES = 8;

// Fase 5 "Mundo Bike": mismo patrón que askDomusChat — el contexto se
// arma de cero en CADA consulta a partir de datos reales de la org (no
// un texto fijo), para que el día que se sumen puntos reales o
// Consultas alcance con sumar esos datos acá, sin tocar la lógica del
// bot. orgId ya alcanza para armar todo desde acá adentro.
export async function askBikeChat(
  orgId: string,
  message: string,
  history: ChatMessage[]
): Promise<AskBikeChatResult> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return { ok: false, error: "invalid" };

  const supabase = createClient();

  const [{ data: org }, { data: productsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("loyalty_organizations")
      .select("name, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("name, price, currency, category_id, is_featured")
      .eq("org_id", orgId)
      .eq("active", true),
    supabase.from("product_categories").select("id, name").eq("org_id", orgId),
  ]);

  const categoryNameById = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));
  const products = productsData ?? [];

  const categoriesSummary =
    (categoriesData ?? []).length > 0
      ? (categoriesData ?? []).map((c) => c.name).join(", ")
      : "sin categorías cargadas";

  const productsSummary =
    products.length > 0
      ? products
          .map((p) => {
            const categoria = p.category_id ? categoryNameById.get(p.category_id) ?? "sin categoría" : "sin categoría";
            const precio = formatPrice(Number(p.price), p.currency);
            return `- ${p.name} — ${categoria}, ${precio}${p.is_featured ? " (Imperdible / destacado)" : ""}`;
          })
          .join("\n")
      : "No hay productos activos cargados en este momento.";

  const orgName = org?.name ?? "la bicicletería";

  // Datos de contacto: solo se mencionan los que la org tiene cargados
  // hoy (ver Gate 0, punto 4) — nunca se inventa un dato vacío.
  const contactLines: string[] = [];
  if (org?.phone_number) contactLines.push(`- Teléfono: ${org.phone_number}`);
  if (org?.whatsapp_number) contactLines.push(`- WhatsApp: disponible (ofrecelo como vía de contacto)`);
  const hasSocials = org?.facebook_url || org?.instagram_url || org?.twitter_url || org?.youtube_url;
  if (hasSocials) contactLines.push(`- Redes sociales: sí tiene (Facebook/Instagram/Twitter/YouTube)`);
  const contactSummary = contactLines.length > 0 ? contactLines.join("\n") : "";

  const systemInstruction = `
Sos el asistente virtual de ${orgName}, una bicicletería. Respondé siempre en español rioplatense, de forma breve, cordial y directa — no más de 3-4 oraciones por respuesta.

REGLAS ESTRICTAS (nunca las rompas):
- Solo podés hablar de los productos, categorías y datos que te paso abajo. NUNCA inventes un producto, precio, característica o dato que no esté acá.
- Si te preguntan por algo que no tenés (un producto que no existe, un precio, una característica no provista), decilo con honestidad — nunca inventes un número o un dato — y sugerí que sigan la consulta por WhatsApp.
- Turnos de Taller (service/reparación): SÍ podés explicar el flujo real, que ya está funcionando — para pedir un turno hay que entrar a "Taller" (desde el menú lateral o desde "Mi Perfil"), elegir un día y un horario disponible, describir el problema, y confirmar. El turno queda pendiente de confirmación del local — el taller lo confirma o lo rechaza después. Nunca inventes plazos de respuesta, precios de service, ni políticas que no estén acá.
- Puntos: existe un sistema de puntos y el saldo se ve en "Mi Perfil", pero TODAVÍA NO hay ninguna forma activa de sumarlos. Si preguntan cómo sumar puntos (o algo equivalente), respondé con honestidad que por ahora no hay una forma activa de sumarlos, y ofrecé el contacto por WhatsApp para más info — nunca inventes un mecanismo (compras, referidos, etc.).
- No dés información de ninguna otra bicicletería ni de ningún otro tema que no sea este negocio.

Datos del local:
${org?.about_text ? `- Sobre nosotros: ${org.about_text}` : ""}
${contactSummary}

Categorías disponibles: ${categoriesSummary}

Productos activos disponibles hoy:
${productsSummary}
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
    console.error("Error al llamar a Gemini (bike):", err instanceof Error ? err.message : err);
    return { ok: false, error: "gemini_error" };
  }
}
