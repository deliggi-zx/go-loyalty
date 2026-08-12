"use client";

import { useState } from "react";
import Link from "next/link";
import {
  VET_APPOINTMENTS_REASONS,
  appointmentReasonLabel,
  isVetAppointmentsClosedDay,
  todayLocalYmd,
} from "./vet-appointments-config";
import {
  createAppointment,
  getAvailableSlotsAction,
  type CreateAppointmentSummary,
} from "./vet-appointments-actions";
import type { OwnerPetOption } from "./vet-appointments-data";

interface VetTurnosBookingProps {
  slug: string;
  orgId: string;
  primaryColor: string;
  pets: OwnerPetOption[];
}

// Sentinel para "no elegí una mascota propia, es una consulta nueva" — no
// puede confundirse con un id real (los ids de vet_pets son uuid).
const NEW_PET_VALUE = "__new__";

type Step = 1 | 2 | 3;

// Wizard de 3 pasos + confirmación, todo en un solo componente (mismo
// criterio que login-form.tsx: un state machine chico con useState, sin
// librería de formularios para algo de este tamaño). Paso 3 hace su
// propio fetch de slots libres contra el server action cada vez que
// cambia la fecha — es la única forma real de no mostrar un horario que
// ya se ocupó (ver getAvailableSlots en vet-appointments-data.ts).
export function VetTurnosBooking({ slug, orgId, primaryColor, pets }: VetTurnosBookingProps) {
  const [step, setStep] = useState<Step>(1);

  // Paso 1
  const [selectedPet, setSelectedPet] = useState<string>(""); // id real o NEW_PET_VALUE
  const [petNameHint, setPetNameHint] = useState("");

  // Paso 2
  const [reason, setReason] = useState<string>("");

  // Paso 3
  const [date, setDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<CreateAppointmentSummary | null>(null);

  async function loadSlotsFor(nextDate: string) {
    setTime("");
    setSlots(null);
    setDateError(null);

    if (!nextDate) return;

    const parsed = new Date(`${nextDate}T00:00:00`);
    if (isVetAppointmentsClosedDay(parsed)) {
      setDateError("Cerrado los domingos — elegí otro día.");
      return;
    }

    setLoadingSlots(true);
    try {
      const available = await getAvailableSlotsAction(orgId, nextDate);
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

    const result = await createAppointment(slug, orgId, {
      petId: selectedPet === NEW_PET_VALUE ? null : selectedPet || null,
      petNameHint: selectedPet === NEW_PET_VALUE ? petNameHint : null,
      reason,
      date,
      time,
    });

    setSubmitting(false);

    if (result.ok) {
      setConfirmed(result.appointment);
      return;
    }

    if (result.error === "slot_taken") {
      // El slot se ocupó justo entre que se mostró y se confirmó — la
      // unique constraint lo rechazó (ver createAppointment). Mensaje
      // simple, no el error crudo de Postgres, y se refresca la lista de
      // slots del mismo día para que el dueño vea al toque que ya no está
      // disponible.
      setSubmitError("Ese horario se acaba de ocupar. Elegí otro.");
      loadSlotsFor(date);
      setTime("");
      return;
    }

    setSubmitError("No pudimos agendar el turno. Probá de nuevo.");
  }

  const step1Valid = selectedPet === NEW_PET_VALUE ? petNameHint.trim() !== "" : selectedPet !== "";
  const step3Valid = date !== "" && time !== "" && !dateError;

  const wrapperClass = "bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4 max-w-md mx-auto";
  const primaryBtnClass =
    "w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40";
  const primaryBtnStyle = { backgroundColor: primaryColor || "#b98a72" };
  const secondaryBtnClass =
    "w-full h-11 rounded-lg text-sm font-medium text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors";
  const optionBtnClass = (active: boolean) =>
    `w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
      active
        ? "border-current font-medium"
        : "border-stone-200 text-stone-700 hover:bg-stone-50"
    }`;

  if (confirmed) {
    const displayDate = new Date(`${confirmed.date}T00:00:00`).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return (
      <div className={`${wrapperClass} text-center`}>
        <div
          className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"
          aria-hidden="true"
        >
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Turno confirmado</p>
          <h2 className="text-lg font-semibold text-stone-900 mt-1">{confirmed.petName}</h2>
        </div>
        <div className="bg-stone-50 rounded-lg p-4 space-y-1 text-sm text-stone-600 text-left">
          <p>
            <span className="text-stone-400">Motivo: </span>
            {appointmentReasonLabel(confirmed.reason)}
          </p>
          <p className="capitalize">
            <span className="text-stone-400">Fecha: </span>
            {displayDate}
          </p>
          <p>
            <span className="text-stone-400">Horario: </span>
            {confirmed.time}
          </p>
        </div>
        <Link
          href={`/${slug}`}
          className="inline-block text-sm font-medium mt-2"
          style={{ color: primaryColor || "#b98a72" }}
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          Paso {step} de 3
        </p>
        <h2 className="text-base font-semibold text-stone-900 mt-0.5">
          {step === 1 && "¿Para qué mascota es el turno?"}
          {step === 2 && "¿Cuál es el motivo?"}
          {step === 3 && "Elegí fecha y horario"}
        </h2>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="space-y-2">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => setSelectedPet(pet.id)}
                className={optionBtnClass(selectedPet === pet.id)}
                style={selectedPet === pet.id ? { color: primaryColor || "#b98a72" } : undefined}
              >
                {pet.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPet(NEW_PET_VALUE)}
              className={optionBtnClass(selectedPet === NEW_PET_VALUE)}
              style={selectedPet === NEW_PET_VALUE ? { color: primaryColor || "#b98a72" } : undefined}
            >
              Primera consulta / mascota nueva
            </button>
          </div>

          {selectedPet === NEW_PET_VALUE && (
            <input
              type="text"
              placeholder="Nombre de tu mascota"
              value={petNameHint}
              onChange={(e) => setPetNameHint(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
            />
          )}

          <button
            type="button"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            className={primaryBtnClass}
            style={primaryBtnStyle}
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="space-y-2">
            {VET_APPOINTMENTS_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={optionBtnClass(reason === r.value)}
                style={reason === r.value ? { color: primaryColor || "#b98a72" } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className={secondaryBtnClass}>
              Atrás
            </button>
            <button
              type="button"
              disabled={!reason}
              onClick={() => setStep(3)}
              className={primaryBtnClass}
              style={primaryBtnStyle}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Fecha</label>
            <input
              type="date"
              min={todayLocalYmd()}
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
            />
            {dateError && <p className="text-xs text-red-600">{dateError}</p>}
          </div>

          {date && !dateError && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Horario disponible</label>
              {loadingSlots ? (
                <p className="text-xs text-stone-400">Buscando horarios...</p>
              ) : slots && slots.length === 0 ? (
                <p className="text-xs text-stone-400">No quedan horarios libres ese día. Probá con otra fecha.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(slots ?? []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                        time === s
                          ? "border-current"
                          : "border-stone-200 text-stone-700 hover:bg-stone-50"
                      }`}
                      style={time === s ? { color: primaryColor || "#b98a72" } : undefined}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {submitError && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className={secondaryBtnClass}>
              Atrás
            </button>
            <button
              type="button"
              disabled={!step3Valid || submitting}
              onClick={handleConfirm}
              className={primaryBtnClass}
              style={primaryBtnStyle}
            >
              {submitting ? "Confirmando..." : "Confirmar turno"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
