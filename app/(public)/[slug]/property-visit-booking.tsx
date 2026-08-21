"use client";

import { useState } from "react";
import { todayLocalYmd } from "./vet-appointments-config";
import {
  createPropertyVisit,
  getAvailableVisitSlotsAction,
  type CreatePropertyVisitSummary,
} from "./domus-visits-actions";

interface PropertyVisitBookingProps {
  slug: string;
  orgId: string;
  productId: string;
  primaryColor: string;
}

// Fase 1 Domus: reserva de visita a una propiedad puntual, desde su
// ficha. Un solo paso (fecha + horario) en vez del wizard de 3 pasos de
// Huellitas (vet-turnos-booking.tsx) — acá no hace falta elegir "para
// quién" ni "motivo": la propiedad ya está fija (viene de la ficha) y el
// cliente ya está identificado por la sesión. El horario mostrado es la
// unión de todos los agentes (getAvailableVisitSlotsAction) — el cliente
// nunca elige agente, ver createPropertyVisit en domus-visits-actions.ts
// para cómo se decide cuál se la lleva.
export function PropertyVisitBooking({
  slug,
  orgId,
  productId,
  primaryColor,
}: PropertyVisitBookingProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<CreatePropertyVisitSummary | null>(null);

  async function loadSlotsFor(nextDate: string) {
    setTime("");
    setSlots(null);
    if (!nextDate) return;
    setLoadingSlots(true);
    try {
      const available = await getAvailableVisitSlotsAction(orgId, nextDate);
      setSlots(available);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    loadSlotsFor(nextDate);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await createPropertyVisit(slug, orgId, { productId, date, time, phone });

    setSubmitting(false);

    if (result.ok) {
      setConfirmed(result.visit);
      return;
    }

    if (result.error === "slot_taken") {
      // Mismo criterio que vet-turnos-booking.tsx: el horario se ocupó
      // entre que se mostró y se confirmó — se refresca la lista del
      // mismo día para que el cliente vea al toque que ya no está.
      setSubmitError("Ese horario se acaba de ocupar. Elegí otro.");
      loadSlotsFor(date);
      setTime("");
      return;
    }

    setSubmitError("No pudimos agendar la visita. Probá de nuevo.");
  }

  const primaryBtnClass =
    "w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40";
  const primaryBtnStyle = { backgroundColor: primaryColor };
  const secondaryBtnClass =
    "w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50";

  if (confirmed) {
    const displayDate = new Date(`${confirmed.date}T00:00:00`).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-center">
        <p className="text-sm font-semibold text-stone-900">¡Visita agendada!</p>
        <p className="text-sm text-stone-600 capitalize">
          {displayDate} a las {confirmed.time}
        </p>
        <p className="text-xs text-stone-400">Un agente te va a estar esperando en el horario elegido.</p>
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
        Solicitar visita
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">Elegí día y horario</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancelar
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-600">Fecha</label>
        <input
          type="date"
          min={todayLocalYmd()}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
        />
      </div>

      {date && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Horario disponible</label>
          {loadingSlots ? (
            <p className="text-xs text-stone-400">Buscando horarios...</p>
          ) : slots && slots.length === 0 ? (
            <p className="text-xs text-stone-400">
              No hay horarios libres ese día. Probá con otra fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(slots ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                    time === s ? "border-current" : "border-stone-200 text-stone-700 hover:bg-stone-50"
                  }`}
                  style={time === s ? { color: primaryColor } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {date && time && (
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
      )}

      {submitError && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {submitError}
        </div>
      )}

      <button
        type="button"
        disabled={!date || !time || !phone.trim() || submitting}
        onClick={handleConfirm}
        className={primaryBtnClass}
        style={primaryBtnStyle}
      >
        {submitting ? "Confirmando..." : "Confirmar visita"}
      </button>
    </div>
  );
}
