"use client";

import { useState } from "react";
import { Dumbbell, Home, TreePine } from "lucide-react";

interface GymProfileHeaderProps {
  greeting: string;
  userName: string;
}

type TrainingMode = "gym" | "home" | "outdoor";

const MODES: { id: TrainingMode; label: string; icon: typeof Dumbbell }[] = [
  { id: "gym", label: "Entrenar en el gym", icon: Dumbbell },
  { id: "home", label: "Entrenar en casa", icon: Home },
  { id: "outdoor", label: "Entrenar al aire libre", icon: TreePine },
];

// Cabecera del showroom de entrenamiento de Gym2 (Fase 1 de 7, inspirado en
// BIGG): saludo + selector de modalidad. Los 3 accesos todavía no navegan a
// ningún lado — eso llega en las fases siguientes — por ahora solo marcan
// un estado "seleccionado" visual, mismo patrón de encendido/apagado que
// las tarjetas de plan (.gym-plan-card en globals.css), sin escribir nada
// en base de datos.
export function GymProfileHeader({ greeting, userName }: GymProfileHeaderProps) {
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);

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
            onClick={() => setSelectedMode(id)}
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
    </div>
  );
}
