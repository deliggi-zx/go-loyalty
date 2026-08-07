"use client";

import { useState } from "react";
import { Dumbbell, Home, TreePine } from "lucide-react";
import type { GymLocation, GymClassData } from "./gym-data";
import { GymTrainingModal } from "./gym-training-modal";

interface GymProfileHeaderProps {
  greeting: string;
  userName: string;
  locations: GymLocation[];
  classes: GymClassData[];
}

type TrainingMode = "gym" | "home" | "outdoor";

const MODES: { id: TrainingMode; label: string; icon: typeof Dumbbell }[] = [
  { id: "gym", label: "Entrenar en el gym", icon: Dumbbell },
  { id: "home", label: "Entrenar en casa", icon: Home },
  { id: "outdoor", label: "Entrenar al aire libre", icon: TreePine },
];

// Cabecera del showroom de entrenamiento de Gym2 (Fase 1: saludo + selector
// de modalidad. Fase 2: cualquiera de las 3 tarjetas abre el mismo flujo de
// selección/reserva de clase en GymTrainingModal — no hay diferencia
// funcional entre gym/casa/aire libre todavía). Nada de esto escribe en
// base de datos.
export function GymProfileHeader({ greeting, userName, locations, classes }: GymProfileHeaderProps) {
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  function handleSelectMode(id: TrainingMode) {
    setSelectedMode(id);
    setShowBooking(true);
  }

  const activeModeLabel = MODES.find((m) => m.id === selectedMode)?.label ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {userName}
        </h1>
        <p className="text-sm text-[#9b9995]">¿Qué querés hacer hoy?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSelectMode(id)}
            aria-pressed={selectedMode === id}
            className={`gym-plan-card flex flex-col items-center justify-center gap-2 px-4 py-6 text-center ${
              selectedMode === id ? "is-open" : ""
            }`}
          >
            <Icon className="w-6 h-6 neon-icon" />
            <span className="text-sm font-semibold text-white">{label}</span>
          </button>
        ))}
      </div>

      {showBooking && (
        <GymTrainingModal
          modeLabel={activeModeLabel}
          locations={locations}
          classes={classes}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
}
