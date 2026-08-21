"use client";

import { useState } from "react";
import { createGeneralInquiry } from "./domus-inquiries-actions";

interface GeneralInquiryFormProps {
  slug: string;
  orgId: string;
  primaryColor: string;
}

// Fase 2b Domus: mismo patrón de toggle que PropertyVisitBooking (Fase
// 1) — botón "Consultas" que revela el form, no un form siempre abierto.
// Para cuando el cliente no busca una propiedad puntual sino que "busca
// algo" — más simple que "ofrecer mi propiedad" (esa es la Fase 3, con
// fotos y cuestionario): acá es un solo textarea libre.
export function GeneralInquiryForm({ slug, orgId, primaryColor }: GeneralInquiryFormProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await createGeneralInquiry(slug, orgId, message, phone);

    setSubmitting(false);

    if (result.ok) {
      setConfirmed(true);
      return;
    }

    setSubmitError("No pudimos enviar tu consulta. Probá de nuevo.");
  }

  const secondaryBtnClass =
    "w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50";
  const primaryBtnClass =
    "w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40";

  if (confirmed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1 text-center">
        <p className="text-sm font-semibold text-stone-900">¡Consulta enviada!</p>
        <p className="text-xs text-stone-500">Un agente te va a contactar a la brevedad.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={secondaryBtnClass}
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        Consultas
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">Contanos qué estás buscando</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancelar
        </button>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder='Ej. "Busco depto de 2 ambientes en Palermo, hasta USD 150.000"'
        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-none"
      />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-600">Teléfono</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej. 11 2345-6789"
          className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
        />
      </div>

      {submitError && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {submitError}
        </div>
      )}

      <button
        type="button"
        disabled={!message.trim() || !phone.trim() || submitting}
        onClick={handleSubmit}
        className={primaryBtnClass}
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? "Enviando..." : "Enviar consulta"}
      </button>
    </div>
  );
}
