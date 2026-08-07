"use client";

import { useEffect, useState } from "react";
import { BicepsFlexed, Heart, X } from "lucide-react";
// Mismo dataset/markup de bloques que Fases 5 y 6 — no se duplica contenido.
import { SHOWROOM_WORKOUT, WorkoutBlocks } from "./gym-workout-plan";

// Fase 7 del showroom de Gym2: popup de "entrenamiento recomendado" que se
// muestra solo, sin que el socio tenga que tocar nada, poco después de
// entrar a Mi Perfil. Mismo shell de modal/bottom-sheet que ya usan
// GymWorkoutPlan y GymGoalPicker (fixed inset-0 + overlay + sheet), solo que
// acá el estado `open` lo dispara un timer en vez de un botón. Se puede
// cerrar con la X o tocando el fondo, igual que los otros 3 accesos.
const AUTO_OPEN_DELAY_MS = 900;

// Las reacciones (❤️ / 💪) son cosméticas: solo cambian de color al
// tocarlas, no se guardan en ningún lado ni afectan la recomendación — no
// hay una tabla de reacciones todavía.
type Reaction = "heart" | "biceps";

export function GymRecommendedPopup() {
  const [open, setOpen] = useState(false);
  const [reactions, setReactions] = useState<Record<Reaction, boolean>>({
    heart: false,
    biceps: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function toggleReaction(reaction: Reaction) {
    setReactions((prev) => ({ ...prev, [reaction]: !prev[reaction] }));
  }

  if (!open) return null;

  return (
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
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <h2 className="text-lg font-semibold text-white">Recomendado para vos</h2>
              <p className="text-xs text-[#9b9995]">{SHOWROOM_WORKOUT.title}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleReaction("heart")}
                aria-pressed={reactions.heart}
                aria-label="Me encanta"
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                  reactions.heart
                    ? "bg-[#ccff00]/10 border-[#ccff00] text-[#ccff00]"
                    : "border-[#26262a] text-[#9b9995] hover:border-[#ccff00]/50 hover:text-[#ccff00]"
                }`}
              >
                <Heart className={`w-4 h-4 ${reactions.heart ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => toggleReaction("biceps")}
                aria-pressed={reactions.biceps}
                aria-label="Me reta"
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                  reactions.biceps
                    ? "bg-[#ccff00]/10 border-[#ccff00] text-[#ccff00]"
                    : "border-[#26262a] text-[#9b9995] hover:border-[#ccff00]/50 hover:text-[#ccff00]"
                }`}
              >
                <BicepsFlexed className="w-4 h-4" />
              </button>
            </div>
          </div>

          <WorkoutBlocks blocks={SHOWROOM_WORKOUT.blocks} />
        </div>
      </div>
    </div>
  );
}
