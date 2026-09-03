"use client";

import { useState } from "react";
import { ArrowRight, MessageCircle, RotateCcw, ShieldOff, X } from "lucide-react";
import { fillMessageVars, whatsappTextHref } from "./portfolio";

export interface WaContact {
  id: string;
  name: string;
  phone: string;
  // true = consintió; false = dijo que no; null = no se registró (clientes
  // con cuenta, que nunca pasaron por ese checkbox).
  consintioComunicaciones: boolean | null;
}

// Envío guiado de WhatsApp a varios clientes. NO manda nada solo — eso
// necesitaría la API paga de WhatsApp Business. Lo que hace: se escribe un
// mensaje único (con {nombre} como variable) y después abre wa.me uno por
// uno, con el texto precargado, para que la persona solo apriete enviar y
// pase al siguiente sin volver a buscar cada contacto.
export function WhatsappBlast({
  contacts,
  onClose,
  onFinished,
}: {
  contacts: WaContact[];
  // Cerrar el modal dejando la selección intacta (volver / X / clic afuera).
  onClose: () => void;
  // Tanda terminada ("Terminar" en el último): cierra y limpia la selección.
  onFinished: () => void;
}) {
  const [step, setStep] = useState<"compose" | "send">("compose");
  const [message, setMessage] = useState("");
  const [index, setIndex] = useState(0);

  const sinConsentimiento = contacts.filter((c) => c.consintioComunicaciones !== true).length;
  const current = contacts[index];
  const isLast = index >= contacts.length - 1;

  function openFor(c: WaContact) {
    const text = fillMessageVars(message, c.name);
    window.open(whatsappTextHref(c.phone, text), "_blank", "noopener,noreferrer");
  }

  function start() {
    if (!message.trim() || contacts.length === 0) return;
    setIndex(0);
    setStep("send");
    openFor(contacts[0]);
  }

  function next() {
    if (isLast) {
      onFinished();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    openFor(contacts[nextIndex]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Enviar WhatsApp a varios
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "compose" ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-600 leading-snug">
              Escribí el mensaje una sola vez. Después se abre WhatsApp cliente por
              cliente con el texto ya cargado — vos solo apretás enviar y pasás al
              siguiente.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-600">Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Hola {nombre}, ¿cómo estás? Te escribo de..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-y"
              />
              <p className="text-xs text-stone-400">
                Usá <span className="font-mono text-stone-600">{"{nombre}"}</span> y se
                reemplaza por el nombre de cada cliente.
              </p>
            </div>

            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
              <p className="text-xs text-stone-600">
                Se va a abrir WhatsApp para{" "}
                <span className="font-semibold text-stone-800">
                  {contacts.length} {contacts.length === 1 ? "cliente" : "clientes"}
                </span>
                .
              </p>
              {sinConsentimiento > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-stone-500">
                  <ShieldOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {sinConsentimiento === 1
                    ? "1 no tiene consentimiento de comunicaciones registrado."
                    : `${sinConsentimiento} no tienen consentimiento de comunicaciones registrado.`}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={start}
                disabled={!message.trim() || contacts.length === 0}
                className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >
                Empezar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">
                  {index + 1} de {contacts.length}
                </span>
                <span>{contacts.length - index - 1} restantes</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${((index + 1) / contacts.length) * 100}%` }}
                />
              </div>
            </div>

            {current && (
              <div className="rounded-lg border border-stone-200 p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{current.name}</p>
                  <p className="text-xs text-stone-400">{current.phone}</p>
                </div>
                {current.consintioComunicaciones !== true && (
                  <p className="flex items-start gap-1.5 text-xs text-stone-500">
                    <ShieldOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Sin consentimiento de comunicaciones registrado.
                  </p>
                )}
                <p className="text-xs text-stone-500 whitespace-pre-wrap border-t border-stone-100 pt-2">
                  {fillMessageVars(message, current.name)}
                </p>
              </div>
            )}

            <p className="text-xs text-stone-400 leading-snug">
              Si WhatsApp no se abrió (el navegador puede bloquear la primera
              ventana), usá &laquo;Abrir de nuevo&raquo;.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => current && openFor(current)}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm font-medium text-stone-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Abrir de nuevo
              </button>
              <button
                type="button"
                onClick={next}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                {isLast ? (
                  "Terminar"
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
