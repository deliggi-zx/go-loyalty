"use client";

import { useState } from "react";
import {
  getAvailableWorkshopDaysAction,
  createWorkshopAppointment,
} from "../bike-workshop-actions";
import type { WorkshopAvailableDay } from "../bike-workshop-data";

interface WorkshopBookingProps {
  slug: string;
  orgId: string;
  capacityPerSlot: number;
  initialDays: WorkshopAvailableDay[];
}

function formatDate(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Fase T2 "Mundo Bike" Taller: reserva del lado cliente — elegir día,
// elegir horario, describir el problema, confirmar. Estética
// oscuro+naranja consistente con el resto de "bike" (mismo criterio de
// tokens que login-form.tsx/points-panel.tsx: bg-[#0a0a0b], acentos
// #ff6b00). No construye todavía cancelación ni panel de confirmar/
// rechazar del lado admin — eso es la Fase T3.
export function WorkshopBooking({ slug, orgId, capacityPerSlot, initialDays }: WorkshopBookingProps) {
  const [days, setDays] = useState(initialDays);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  function pickDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setError(null);
  }

  function pickTime(time: string) {
    setSelectedTime(time);
    setError(null);
  }

  async function refreshDays() {
    const fresh = await getAvailableWorkshopDaysAction(orgId, capacityPerSlot);
    setDays(fresh);
    return fresh;
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedTime || !description.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await createWorkshopAppointment(
      slug,
      orgId,
      capacityPerSlot,
      selectedDate,
      selectedTime,
      description
    );

    if (!result.ok) {
      if (result.error === "slot_taken") {
        // Alguien más tomó ese horario mientras el cliente completaba el
        // formulario — se refresca la disponibilidad real en vez de
        // fallar en silencio, y se resetea la selección de horario (el
        // día elegido puede seguir teniendo OTROS horarios libres).
        const fresh = await refreshDays();
        const stillHasDay = fresh.some((d) => d.date === selectedDate);
        setSelectedTime(null);
        setError(
          stillHasDay
            ? "Ese horario ya no tiene lugar — elegí otro de los que quedan disponibles."
            : "Ese día ya no tiene horarios disponibles — elegí otro día."
        );
        if (!stillHasDay) setSelectedDate(null);
      } else {
        setError("No pudimos guardar tu turno. Probá de nuevo en un momento.");
      }
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="bg-[#0a0a0b] rounded-2xl border border-[#26262a] p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-950/40 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-white">Tu turno quedó pendiente de confirmación</p>
        <p className="text-sm text-[#9b9995]">
          {selectedDate && formatDate(selectedDate)} · {selectedTime}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0b] rounded-2xl border border-[#26262a] p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#9b9995]">Día</label>
        {days.length === 0 ? (
          <p className="text-sm text-[#6b6965]">No hay días con disponibilidad por ahora.</p>
        ) : (
          <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 p-3 rounded-lg border border-[#26262a] bg-[#141416]">
            {days.map((d) => {
              const selected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => pickDate(d.date)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-[#ff6b00] border-[#ff6b00] text-[#0a0a0b]"
                      : "bg-[#0a0a0b] border-[#26262a] text-[#d8d6d2] hover:border-[#ff6b00]/60"
                  }`}
                >
                  {formatDate(d.date)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9b9995]">Horario</label>
          <div className="flex flex-wrap gap-2">
            {selectedDay.slots.map((time) => {
              const selected = time === selectedTime;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => pickTime(time)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-[#ff6b00] border-[#ff6b00] text-[#0a0a0b]"
                      : "bg-[#141416] border-[#26262a] text-[#d8d6d2] hover:border-[#ff6b00]/60"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedTime && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9b9995]">Contanos qué le pasa a tu bici</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Ej. frenos que chillan, cambios que no entran bien..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-[#26262a] bg-[#141416] text-white placeholder:text-[#6b6965] focus:outline-none focus:border-[#ff6b00] transition-colors resize-none"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-300 bg-red-950/40 rounded-lg px-3 py-2 border border-red-800">{error}</p>}

      {selectedTime && (
        <button
          type="button"
          disabled={!description.trim() || submitting}
          onClick={handleConfirm}
          className="w-full h-10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 border border-[#ff6b00] text-[#ff6b00] bg-[#ff6b00]/10 hover:bg-[#ff6b00]/20"
        >
          {submitting ? "Confirmando..." : "Confirmar turno"}
        </button>
      )}
    </div>
  );
}
