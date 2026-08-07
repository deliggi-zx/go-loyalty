"use client";

import { useState } from "react";
import { Check, X, CreditCard, CheckCircle2 } from "lucide-react";
import type { GymPlan } from "./gym-plans-section";

interface GymPlanCardProps {
  plan: GymPlan;
}

// Tarjeta de plan con el mismo lenguaje visual que las de sede/clase (ver
// .gym-plan-card en globals.css): apagada en reposo, se enciende con el
// halo #ccff00 al hover/focus/tap. El botón "Contratar ahora" es 100%
// cosmético — igual que "Anotarme" en Clases, el estado `hired` es local y
// efímero, no toca ninguna tabla ni backend real.
export function GymPlanCard({ plan }: GymPlanCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hired, setHired] = useState(false);

  function handleTap() {
    setIsOpen(true);
    window.setTimeout(() => setIsOpen(false), 1600);
  }

  return (
    <div
      className={`gym-plan-card flex flex-col h-full ${isOpen ? "is-open" : ""} ${
        plan.featured ? "gym-plan-card-featured" : ""
      }`}
      onClick={handleTap}
    >
      {plan.featured && <span className="gym-plan-badge">Mejor precio</span>}

      <div className="p-5 sm:p-6 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="gym-plan-name font-black uppercase tracking-wide text-lg sm:text-xl">
            {plan.name}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">{plan.tagline}</p>
        </div>

        <div>
          <div className="flex items-end gap-1.5">
            <span className="gym-plan-price font-black text-3xl sm:text-4xl leading-none">
              {plan.monthlyPrice}
            </span>
            <span className="text-xs sm:text-sm text-stone-400 mb-0.5">/mes</span>
          </div>
          {plan.secondaryPrice && (
            <p className="text-xs sm:text-sm text-stone-400 mt-1.5">{plan.secondaryPrice}</p>
          )}
        </div>

        <ul className="space-y-1.5 sm:space-y-2 flex-1">
          {plan.benefits.map((b) => (
            <li key={b.label} className="flex items-center gap-2 text-xs sm:text-sm">
              {b.included ? (
                <Check className="gym-plan-check w-4 h-4 shrink-0" />
              ) : (
                <X className="w-4 h-4 shrink-0 text-stone-600" />
              )}
              <span className={b.included ? "text-stone-200" : "text-stone-500 line-through"}>
                {b.label}
              </span>
            </li>
          ))}
        </ul>

        {hired ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4" />
            ¡Contratado!
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHired(true);
            }}
            className="gym-class-btn"
          >
            <CreditCard className="w-4 h-4" />
            Contratar ahora
          </button>
        )}
      </div>
    </div>
  );
}
