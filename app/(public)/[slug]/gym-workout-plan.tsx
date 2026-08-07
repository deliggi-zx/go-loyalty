"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";

interface GymWorkoutPlanProps {
  userName: string;
}

// Fase 5 del showroom de Gym2: "Mi entrenamiento de hoy" es un acceso propio
// (no depende de haber reservado una clase, a diferencia de
// gym-training-modal.tsx) con el detalle de un entrenamiento armado en
// bloques. Mismo set fijo de bloques/ejercicios para cualquier socio que
// abra este acceso — no viene de gym_classes ni de ninguna tabla real, es
// contenido de ejemplo tipo BIGG. No escribe nada en base de datos.
const SHOWROOM_WORKOUT = {
  title: "Full Body Burn",
  blocks: [
    {
      id: "activacion",
      method: "Full Body",
      format: "2 vueltas, sin pausa",
      exercises: [
        "10 Banded Air Squats",
        "12 Mountain Climbers",
        "15 Jumping Jacks",
        "10 Push Ups",
      ],
    },
    {
      id: "hiit",
      method: "HIIT",
      format: '40" ON / 20" OFF x 5\'',
      exercises: [
        "Burpees",
        "Kettlebell Swings",
        "Box Jumps",
        "Battle Ropes",
      ],
    },
    {
      id: "amrap",
      method: "AMRAP",
      format: "12 minutos, tantas rondas como puedas",
      exercises: [
        "10 Thrusters",
        "15 Wall Balls",
        "20 Sit Ups",
        "25 Double Unders",
      ],
    },
  ],
} as const;

// Los 3 filtros son puramente visuales: solo hay un set fijo de bloques de
// showroom y ninguno trae metadata real de duración/intensidad por
// ejercicio, así que cablear el filtrado de verdad para "Método" (el único
// que calzaría con los datos) y dejar Duración/Intensidad decorativos sería
// inconsistente. Priorizamos consistencia entre los 3 sobre funcionalidad
// parcial — igual que la franja horaria en gym-training-modal.tsx, acá el
// usuario ve el chip encenderse pero el contenido de abajo no cambia.
const FILTERS = [
  { id: "duracion", label: "Duración", options: ["20'", "40'", "60'"] },
  { id: "metodo", label: "Método", options: ["HIIT", "Full Body", "AMRAP"] },
  { id: "intensidad", label: "Intensidad", options: ["Baja", "Media", "Alta"] },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function GymWorkoutPlan({ userName }: GymWorkoutPlanProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Partial<Record<FilterId, string>>>({});

  function toggleFilter(filterId: FilterId, option: string) {
    setSelected((prev) => ({
      ...prev,
      // Tocar el mismo chip otra vez lo apaga, mismo comportamiento que un
      // toggle de selección única.
      [filterId]: prev[filterId] === option ? undefined : option,
    }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0e] border border-[#26262a] hover:border-[#ccff00]/50 transition-colors text-left"
      >
        <ClipboardList className="w-5 h-5 neon-icon shrink-0" />
        <span className="flex-1 text-sm font-semibold text-white">Mi entrenamiento de hoy</span>
        <span className="text-[#6b6965]">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:max-w-md max-h-[92vh] bg-[#0a0a0b] border border-[#26262a] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 border border-[#26262a] flex items-center justify-center text-[#9b9995] hover:text-[#ccff00] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">{SHOWROOM_WORKOUT.title}</h2>
                <p className="text-xs text-[#9b9995]">Hoy para {userName}</p>
              </div>

              <div className="space-y-4">
                {FILTERS.map((filter) => (
                  <section key={filter.id} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
                      {filter.label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {filter.options.map((option) => {
                        const isOn = selected[filter.id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleFilter(filter.id, option)}
                            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors ${
                              isOn
                                ? "bg-[#ccff00] text-[#0a0a0b] border-[#ccff00]"
                                : "border-[#26262a] text-[#9b9995] hover:border-[#ccff00]/50 hover:text-[#ccff00]"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="space-y-4">
                {SHOWROOM_WORKOUT.blocks.map((block, i) => (
                  <div
                    key={block.id}
                    className="space-y-3 bg-[#141416] border border-[#26262a] rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white">Bloque {i + 1}</span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]">
                        {block.method}
                      </span>
                    </div>
                    <p className="text-xs text-[#9b9995]">{block.format}</p>
                    <ol className="space-y-1.5">
                      {block.exercises.map((exercise, j) => (
                        <li key={j} className="flex gap-2 text-sm text-[#d8d6d2]">
                          <span className="text-[#6b6965]">{j + 1}.</span>
                          {exercise}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
