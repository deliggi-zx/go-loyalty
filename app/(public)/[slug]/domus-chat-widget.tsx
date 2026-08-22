"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X, Send } from "lucide-react";
import { askDomusChat, type ChatMessage } from "./domus-chat-actions";

interface DomusChatWidgetProps {
  slug: string;
  orgId: string;
  whatsappNumber: string | null;
}

const DOMUS_NAVY = "#123B4A";
const DOMUS_SAND = "#D6B98C";

// Fase chatbot Domus: historial solo en memoria de este componente (no
// se persiste en la base, pedido explícito para esta fase) — se pierde
// al cerrar/recargar, no hay nada más que hacer acá. El fallback de
// "hablar con una persona" se muestra debajo de CADA respuesta del bot
// (no solo cuando el modelo detecta que hace falta): más simple y
// confiable que pedirle al modelo una señal estructurada aparte, y
// cubre el mismo caso ("al final de la respuesta... o si detecta que
// quiere hablar con una persona" del pedido) sin depender de que el
// modelo "detecte" nada.
export function DomusChatWidget({ slug, orgId, whatsappNumber }: DomusChatWidgetProps) {
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

    const result = await askDomusChat(orgId, text, messages);

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

  // Mismo fallback humano tanto si hay WhatsApp configurado como si no
  // (hoy Domus no tiene whatsapp_number cargado) — sin número, apunta a
  // la home con el ancla del formulario de consultas ya existente
  // (ver id="consultas" agregado en page.tsx), en vez de un link muerto.
  const fallbackHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : `/${slug}#consultas`;
  const fallbackLabel = whatsappNumber ? "Seguir por WhatsApp" : "Dejar mi consulta";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ backgroundColor: DOMUS_NAVY }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircleQuestion className="w-7 h-7" style={{ color: DOMUS_SAND }} />
        )}
      </button>

      <div
        className={`fixed bottom-[168px] right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col overflow-hidden transition-all duration-200 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="px-4 h-14 flex items-center shrink-0" style={{ backgroundColor: DOMUS_NAVY }}>
          <p className="text-sm font-semibold text-white">Asistente Domus</p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-stone-400 text-center pt-6">
              Preguntame sobre las propiedades disponibles — zona, precio, ambientes.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "text-white" : "bg-stone-100 text-stone-800"
                }`}
                style={m.role === "user" ? { backgroundColor: DOMUS_NAVY } : undefined}
              >
                {m.text}
                {m.role === "model" && (
                  <div className="mt-2 pt-2 border-t border-stone-200">
                    <a
                      href={fallbackHref}
                      target={whatsappNumber ? "_blank" : undefined}
                      rel={whatsappNumber ? "noopener noreferrer" : undefined}
                      className="text-xs font-medium hover:underline"
                      style={{ color: DOMUS_NAVY }}
                    >
                      ¿Preferís hablar con un agente? {fallbackLabel} →
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-stone-100 text-stone-400 rounded-2xl px-3.5 py-2 text-sm">
                Escribiendo...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-stone-100 flex items-center gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribí tu pregunta..."
            disabled={sending}
            className="flex-1 h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 transition-colors disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Enviar"
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: DOMUS_NAVY }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
