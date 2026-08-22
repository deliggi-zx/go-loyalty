"use client";

import { useState } from "react";
import { createPropertyReservation } from "./domus-reservations-actions";

interface PropertyReservationButtonProps {
  slug: string;
  orgId: string;
  productId: string;
  primaryColor: string;
}

// Fase Reservas (Domus): "Reservar" en la ficha de una propiedad
// disponible — el caller (producto/[id]/page.tsx) ya decide si esto se
// monta (isDomus + !isReserved + user logueado), acá solo hace falta el
// teléfono, un único campo, mismo criterio que el resto de los forms
// cortos de Domus (PropertyOfferForm, GeneralInquiryForm).
export function PropertyReservationButton({
  slug,
  orgId,
  productId,
  primaryColor,
}: PropertyReservationButtonProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await createPropertyReservation(slug, orgId, { productId, phone });

    setSubmitting(false);

    if (result.ok) {
      setConfirmed(true);
      return;
    }

    if (result.error === "already_reserved") {
      setSubmitError("Justo se acaba de reservar. Elegí otra propiedad.");
      return;
    }

    setSubmitError("No pudimos registrar la reserva. Probá de nuevo.");
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center space-y-1">
        <p className="text-sm font-semibold text-stone-900">¡Reserva registrada!</p>
        <p className="text-xs text-stone-500">
          En instantes vas a recibir un mail con las instrucciones para confirmar tu reserva.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl text-white font-medium transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        Reservar
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">Confirmá tu teléfono</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancelar
        </button>
      </div>

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
        disabled={!phone.trim() || submitting}
        onClick={handleConfirm}
        className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? "Confirmando..." : "Confirmar reserva"}
      </button>
    </div>
  );
}
