"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X, Send } from "lucide-react";
import { askBikeChat, type ChatMessage } from "./bike-chat-actions";

interface BikeChatWidgetProps {
  slug: string;
  orgId: string;
  whatsappNumber: string | null;
}

// Fase 5 "Mundo Bike": mismo acento naranja que el resto de "bike"
// (--accent-bike, ver globals.css), en vez de la paleta navy/sand de
// Domus. Mismo mecanismo de apilado (bottom-24, arriba de WhatsAppButton
// que ya vive fijo en bottom-5 desde layout.tsx) — ver domus-chat-
// widget.tsx como referencia de patrón, sin reusar nada de ahí.
const BIKE_DARK = "#0a0a0b";
const BIKE_ORANGE = "#ff6b00";

// Historial solo en memoria de este componente (no se persiste en la
// base), mismo criterio que DomusChatWidget — se pierde al cerrar/
// recargar. Fallback de "hablar con una persona" bajo CADA respuesta
// del bot, mismo motivo que Domus: más simple y confiable que pedirle
// al modelo una señal estructurada aparte.
export function BikeChatWidget({ slug, orgId, whatsappNumber }: BikeChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextHistory = [...messages, { role: "user" as const, text }];
    setMessages(nextHistory);
    setInput("");
    setSending(true);

    const result = await askBikeChat(orgId, text, messages);

    setMessages((prev) => [
      ...prev,
      {
        role: "model",
        text: result.ok
          ? result.reply
          : "Uy, tuvimos un problema para responder. Probá de nuevo en un momento, o escribinos directo.",
      },
    ]);
    setSending(false);
  }

  // whatsappNumber siempre está cargado hoy para bike (ver Gate 0), pero
  // se mantiene el mismo fallback a la home que Domus por las dudas.
  const fallbackHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : `/${slug}`;
  const fallbackLabel = whatsappNumber ? "Seguir por WhatsApp" : "Contactanos";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: BIKE_DARK, border: `1px solid ${BIKE_ORANGE}` }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircleQuestion className="w-7 h-7" style={{ color: BIKE_ORANGE }} />
        )}
      </button>

      <div
        className={`fixed bottom-[168px] right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] rounded-2xl shadow-xl border flex flex-col overflow-hidden transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        style={{ backgroundColor: BIKE_DARK, borderColor: "#26262a" }}
      >
        <div className="px-4 h-14 flex items-center shrink-0 border-b" style={{ borderColor: "#26262a" }}>
          <p className="text-sm font-semibold text-white">Asistente Mundo Bike</p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-center pt-6" style={{ color: "#6b6965" }}>
              Preguntame sobre las bicis, accesorios o cómo pedir un turno de taller.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap"
                style={
                  m.role === "user"
                    ? { backgroundColor: BIKE_ORANGE, color: BIKE_DARK }
                    : { backgroundColor: "#141416", color: "#d8d6d2" }
                }
              >
                {m.text}
                {m.role === "model" && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: "#26262a" }}>
                    <a
                      href={fallbackHref}
                      target={whatsappNumber ? "_blank" : undefined}
                      rel={whatsappNumber ? "noopener noreferrer" : undefined}
                      className="text-xs font-medium hover:underline"
                      style={{ color: BIKE_ORANGE }}
                    >
                      ¿Preferís hablar con alguien? {fallbackLabel} →
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3.5 py-2 text-sm" style={{ backgroundColor: "#141416", color: "#6b6965" }}>
                Escribiendo...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t flex items-center gap-2 shrink-0" style={{ borderColor: "#26262a" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribí tu pregunta..."
            disabled={sending}
            className="flex-1 h-10 px-3 text-sm rounded-lg border focus:outline-none transition-colors disabled:opacity-60 bg-[#141416] text-white placeholder:text-[#6b6965]"
            style={{ borderColor: "#26262a" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: BIKE_ORANGE }}
          >
            <Send className="w-4 h-4" style={{ color: BIKE_DARK }} />
          </button>
        </div>
      </div>
    </>
  );
}
