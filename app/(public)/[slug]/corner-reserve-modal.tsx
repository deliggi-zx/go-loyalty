"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import type { CornerCourt } from "./corner-data";

// Horarios mock: bloques de 1hs entre 18:00 y 23:00 — sin chequeo real de
// disponibilidad (Fase 4, pedido explícito). Cuando exista reserva real
// con disponibilidad de verdad, esto pasa a venir del backend en vez de
// ser una lista fija.
const MOCK_TIME_SLOTS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

type Step = "court" | "time" | "confirm" | "success";

// Modal cosmético de reserva (Fase 4) — cancha (real, gym_courts) →
// horario (mock) → confirmación visual. Ningún paso escribe en ninguna
// tabla; "Confirmar reserva" solo avanza al paso de éxito. Se monta una
// única vez por CornerReserveProvider (ver corner-reserve-context.tsx),
// que también controla open/close — este componente no decide cuándo
// abrirse, solo cómo se ve mientras está abierto.
export function CornerReserveModal({
  courts,
  isOpen,
  onClose,
}: {
  courts: CornerCourt[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("court");
  const [selectedCourt, setSelectedCourt] = useState<CornerCourt | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Reset con un pequeño delay al cerrar (deja terminar cualquier
  // transición) — así la próxima apertura arranca siempre desde el paso 1,
  // nunca en medio de un flujo anterior.
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setStep("court");
      setSelectedCourt(null);
      setSelectedTime(null);
    }, 200);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSelectCourt(court: CornerCourt) {
    setSelectedCourt(court);
    setStep("time");
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time);
    setStep("confirm");
  }

  function handleConfirm() {
    // A propósito: sin insert real a ninguna tabla, solo confirmación
    // visual. La reserva real (con disponibilidad de verdad) queda para
    // una fase futura.
    setStep("success");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-sm bg-[#111113] border border-[#26262a] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white uppercase tracking-wide">
            {step === "court" && "Elegí tu cancha"}
            {step === "time" && "Elegí un horario"}
            {step === "confirm" && "Confirmar reserva"}
            {step === "success" && "¡Reserva confirmada!"}
          </p>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="p-1 text-[#9b9995] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "court" && (
          <div className="space-y-2">
            {courts.length === 0 && (
              <p className="text-sm text-[#9b9995]">Todavía no hay canchas cargadas.</p>
            )}
            {courts.map((court) => (
              <button
                key={court.id}
                type="button"
                onClick={() => handleSelectCourt(court)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#141416] border border-[#26262a] hover:border-[#1e8f4e] transition-colors text-left"
              >
                <span className="text-sm font-medium text-white">{court.name}</span>
                <span className="text-xs text-[#9b9995]">{court.courtTypeLabel}</span>
              </button>
            ))}
          </div>
        )}

        {step === "time" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("court")}
              className="text-xs text-[#9b9995] hover:text-white transition-colors"
            >
              ← Cambiar cancha
            </button>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleSelectTime(time)}
                  className="py-2.5 rounded-xl bg-[#141416] border border-[#26262a] hover:border-[#1e8f4e] text-sm font-medium text-white transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "confirm" && selectedCourt && selectedTime && (
          <div className="space-y-4">
            <div className="bg-[#141416] rounded-xl border border-[#26262a] p-4 space-y-1">
              <p className="text-xs text-[#9b9995] uppercase tracking-wide">Resumen</p>
              <p className="text-sm text-white">
                {selectedCourt.name} · {selectedCourt.courtTypeLabel}
              </p>
              <p className="text-sm text-white">Hoy · {selectedTime} hs</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("time")}
                className="flex-1 py-2.5 rounded-xl border border-[#26262a] text-sm font-medium text-[#d8d6d2] hover:border-[#1e8f4e] transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-[#1e8f4e] text-sm font-semibold text-white hover:bg-[#1e8f4e]/90 transition-colors"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        )}

        {step === "success" && selectedCourt && selectedTime && (
          <div className="space-y-4 text-center py-2">
            <CheckCircle2 className="w-12 h-12 text-[#1e8f4e] mx-auto" />
            <div>
              <p className="text-white font-semibold">
                {selectedCourt.name} · {selectedTime} hs
              </p>
              <p className="text-sm text-[#9b9995]">Te esperamos en Corner.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#1e8f4e] text-sm font-semibold text-white hover:bg-[#1e8f4e]/90 transition-colors"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
