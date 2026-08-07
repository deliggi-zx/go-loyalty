"use client";

import { useState } from "react";
import { X, CheckCircle2, UserPlus } from "lucide-react";
import type { GymLocation, GymClassData } from "./gym-data";

interface GymTrainingModalProps {
  modeLabel: string;
  locations: GymLocation[];
  classes: GymClassData[];
  onClose: () => void;
}

// "Gym de Prueba - Sede Centro" → "Centro": los chips de sede muestran solo
// el nombre corto, mismo criterio visual que la referencia (chips tipo
// "RECOLETA").
function shortLocationName(name: string) {
  const match = name.match(/sede\s+(.+)$/i);
  return (match ? match[1] : name).trim();
}

// Franjas horarias fijas: los horarios reales de gym_class_schedule para
// Gym2 solo cubren 07:30-13:00 y 18:00-21:00 (hay un hueco al mediodía), así
// que en vez de derivar la franja "Tarde" de datos inexistentes usamos un
// set fijo de 3 bandas con horarios generados — no reflejan disponibilidad
// real todavía, eso es de una fase posterior.
const TIME_BANDS = [
  { id: "manana", label: "Mañana", times: ["07:00", "08:00", "09:00", "10:00", "11:00"] },
  { id: "tarde", label: "Tarde", times: ["13:00", "14:00", "15:00", "16:00", "17:00"] },
  { id: "noche", label: "Noche", times: ["18:00", "19:00", "20:00", "21:00"] },
] as const;

type BandId = (typeof TIME_BANDS)[number]["id"];

// Iniciales de ejemplo para el efecto "comunidad" — dato de showroom, no
// viene de gym_member_classes. Se reemplaza por datos reales en una fase
// posterior.
const SHOWROOM_ATTENDEES = ["MJ", "FR", "CL", "TS", "AG"];

const chipBase =
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors";
const chipOff = "border-[#26262a] text-[#9b9995] hover:border-[#ccff00]/50 hover:text-[#ccff00]";
const chipOn = "bg-[#ccff00] text-[#0a0a0b] border-[#ccff00]";

function sectionLabel(text: string) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">{text}</h3>
  );
}

// Fases 2 y 3 del showroom de entrenamiento de Gym2: selección y "reserva"
// de clase, y su confirmación — todo cosmético, no escribe nada en base de
// datos. Se abre desde cualquiera de las 3 tarjetas de
// gym-profile-header.tsx; las 3 llevan acá, no hay diferencia funcional
// entre gym/casa/aire libre en esta fase. Al cerrar el modal se desmonta
// (ver showBooking en gym-profile-header.tsx), así que no hace falta
// resetear nada a mano: la próxima vez que se abre arranca de cero solo.
export function GymTrainingModal({ modeLabel, locations, classes, onClose }: GymTrainingModalProps) {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [bandId, setBandId] = useState<BandId | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const selectedBand = TIME_BANDS.find((b) => b.id === bandId);
  const selectedLocation = locations.find((l) => l.id === locationId);
  const selectedClass = classes.find((c) => c.id === classId);
  const isComplete = !!(selectedLocation && selectedBand && time && selectedClass);

  function selectBand(id: BandId) {
    setBandId(id);
    setTime(null); // la franja cambió: el horario elegido antes ya no aplica
  }

  // Fecha decorativa para el resumen de la reserva — "Hoy, <fecha actual>".
  // Se calcula al tocar "Reservar clase", no en cada render.
  const [today] = useState(() =>
    new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long" })
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full sm:max-w-md max-h-[92vh] bg-[#0a0a0b] border border-[#26262a] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 border border-[#26262a] flex items-center justify-center text-[#9b9995] hover:text-[#ccff00] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 space-y-6">
        {confirmed && selectedLocation && selectedBand && selectedClass ? (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto neon-icon" />
              <h2 className="text-xl font-bold text-white">¡Reserva confirmada!</h2>
              <p className="text-xs text-[#9b9995]">vía {modeLabel}</p>
            </div>

            <div className="space-y-2.5 text-left bg-[#141416] border border-[#26262a] rounded-2xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6965]">Sede</span>
                <span className="font-semibold text-white">
                  {shortLocationName(selectedLocation.name)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6965]">Día</span>
                <span className="font-semibold text-white">Hoy, {today}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6965]">Horario</span>
                <span className="font-semibold text-white">
                  {selectedBand.label} {time}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6965]">Clase</span>
                <span className="font-semibold text-white">{selectedClass.name}</span>
              </div>

              {(selectedClass.category || selectedClass.intensity) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedClass.category && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]">
                      {selectedClass.category}
                    </span>
                  )}
                  {selectedClass.intensity && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]">
                      Intensidad {selectedClass.intensity}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {/* Cosmético: no comparte nada real todavía (sin WhatsApp, sin
                  link) — la integración real queda para una fase futura si
                  se pide. */}
              <button
                type="button"
                onClick={() => setInviteSent(true)}
                disabled={inviteSent}
                className={`w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wide border transition-colors flex items-center justify-center gap-2 ${
                  inviteSent
                    ? "border-[#26262a] text-[#6b6965]"
                    : "bg-[#ccff00]/10 border-[#ccff00] text-[#ccff00]"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {inviteSent ? "¡Invitación enviada!" : "Invitar a un amigo a esta clase"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wide text-[#d8d6d2] hover:text-[#ccff00] transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <>
          <div>
            <h2 className="text-lg font-semibold text-white">Reservá tu clase</h2>
            <p className="text-xs text-[#9b9995]">vía {modeLabel}</p>
          </div>

          <section className="space-y-2">
            {sectionLabel("Elegí tu sede")}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocationId(loc.id)}
                  className={`${chipBase} ${locationId === loc.id ? chipOn : chipOff}`}
                >
                  {shortLocationName(loc.name)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            {sectionLabel("Franja horaria")}
            <div className="flex gap-2">
              {TIME_BANDS.map((band) => (
                <button
                  key={band.id}
                  type="button"
                  onClick={() => selectBand(band.id)}
                  className={`${chipBase} ${bandId === band.id ? chipOn : chipOff}`}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </section>

          {selectedBand && (
            <section className="space-y-2">
              {sectionLabel("Horario")}
              <div className="grid grid-cols-4 gap-2">
                {selectedBand.times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      time === t ? chipOn : chipOff
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            {sectionLabel("Tipo de clase")}
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setClassId(cls.id)}
                  className={`${chipBase} ${classId === cls.id ? chipOn : chipOff}`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            {sectionLabel("Quiénes ya se anotaron")}
            <div className="flex -space-x-2">
              {SHOWROOM_ATTENDEES.map((initials) => (
                <div
                  key={initials}
                  className="w-8 h-8 rounded-full bg-[#141416] border-2 border-[#0a0a0b] ring-1 ring-[#ccff00]/40 flex items-center justify-center text-[10px] font-semibold text-[#ccff00]"
                >
                  {initials}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-[#141416] border-2 border-[#0a0a0b] ring-1 ring-[#26262a] flex items-center justify-center text-[10px] font-semibold text-[#9b9995]">
                +12
              </div>
            </div>
          </section>

          <div className="space-y-2 pt-3 border-t border-[#26262a]">
            {isComplete && (
              <p className="text-sm text-[#d8d6d2]">
                <span className="text-[#ccff00] font-semibold">
                  {shortLocationName(selectedLocation.name)}
                </span>
                {" · "}
                {selectedBand.label} {time}
                {" · "}
                {selectedClass.name}
              </p>
            )}

            <button
              type="button"
              disabled={!isComplete}
              onClick={() => setConfirmed(true)}
              className={`w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-wide border transition-colors ${
                isComplete
                  ? "bg-[#ccff00]/10 border-[#ccff00] text-[#ccff00]"
                  : "border-[#26262a] text-[#4b4a48] cursor-not-allowed"
              }`}
            >
              Reservar clase
            </button>
          </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
