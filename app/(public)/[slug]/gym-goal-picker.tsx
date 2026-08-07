"use client";

import { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
// Reutiliza el dataset y el markup de bloques de la Fase 5 en vez de
// duplicarlos: SHOWROOM_WORKOUT sigue siendo el mismo set de ejemplo fijo
// de gym-workout-plan.tsx, no una recomendación real calculada a partir del
// objetivo/deporte elegido acá.
import { SHOWROOM_WORKOUT, WorkoutBlocks } from "./gym-workout-plan";

// Fase 6 del showroom de Gym2: "Personalizá tu entrenamiento" es un cuarto
// acceso propio en Mi Perfil. Tags y tarjetas de deporte son contenido fijo
// de ejemplo — no hay objetivos reales en ninguna tabla todavía, y tocar
// cualquiera de ellos lleva a la misma recomendación (no hay
// diferenciación real por objetivo/deporte en esta fase). No escribe nada
// en base de datos.
const QUICK_TAGS = ["Quemar calorías", "Fitness", "Fútbol", "Run 10k"] as const;

const SPORT_CARDS = [
  { id: "futbol", label: "Fútbol", emoji: "⚽" },
  { id: "tenis", label: "Tenis", emoji: "🎾" },
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "boxeo", label: "Boxeo", emoji: "🥊" },
] as const;

export function GymGoalPicker() {
  const [open, setOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function selectGoal(label: string) {
    setSelectedGoal(label);
  }

  function handleClose() {
    setOpen(false);
    // La próxima vez que se abre arranca de cero, mismo criterio que
    // gym-training-modal.tsx al desmontarse.
    setSelectedGoal(null);
    setSearch("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0e] border border-[#26262a] hover:border-[#ccff00]/50 transition-colors text-left"
      >
        <Sparkles className="w-5 h-5 neon-icon shrink-0" />
        <span className="flex-1 text-sm font-semibold text-white">Personalizá tu entrenamiento</span>
        <span className="text-[#6b6965]">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

          <div className="relative w-full sm:max-w-md max-h-[92vh] bg-[#0a0a0b] border border-[#26262a] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 border border-[#26262a] flex items-center justify-center text-[#9b9995] hover:text-[#ccff00] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Elegí tu objetivo de entrenamiento</h2>
                <p className="text-xs text-[#9b9995]">
                  Te armamos una rutina recomendada según lo que quieras lograr.
                </p>
              </div>

              {/* Buscador decorativo: no filtra nada real todavía, solo
                  guarda el texto tipeado. */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6965]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar objetivos"
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-[#26262a] bg-[#141416] text-white placeholder:text-[#6b6965] focus:outline-none focus:border-[#ccff00] focus:shadow-[0_0_0_1px_#ccff00,0_0_10px_rgba(204,255,0,0.35)] transition-colors"
                />
              </div>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
                  Tags rápidos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => selectGoal(tag)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors ${
                        selectedGoal === tag
                          ? "bg-[#ccff00] text-[#0a0a0b] border-[#ccff00]"
                          : "border-[#26262a] text-[#9b9995] hover:border-[#ccff00]/50 hover:text-[#ccff00]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
                  Por deporte
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {SPORT_CARDS.map((sport) => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => selectGoal(sport.label)}
                      aria-pressed={selectedGoal === sport.label}
                      className={`gym-plan-card flex flex-col items-center justify-center gap-1.5 px-4 py-5 text-center ${
                        selectedGoal === sport.label ? "is-open" : ""
                      }`}
                    >
                      <span className="text-2xl">{sport.emoji}</span>
                      <span className="text-sm font-semibold text-white">{sport.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selectedGoal && (
                <section className="space-y-3 pt-3 border-t border-[#26262a]">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
                      Recomendado para tu objetivo
                    </h3>
                    <p className="text-sm text-[#d8d6d2]">
                      <span className="text-[#ccff00] font-semibold">{selectedGoal}</span>
                      {" · "}
                      {SHOWROOM_WORKOUT.title}
                    </p>
                  </div>
                  <WorkoutBlocks blocks={SHOWROOM_WORKOUT.blocks} />
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
