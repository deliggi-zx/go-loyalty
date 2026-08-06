"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { ClassPlaceholder } from "./gym-placeholder";
import type { GymClassData } from "./gym-data";

const DAY_LABELS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]; // day_of_week 1..7

function formatTime(t: string) {
  return t.slice(0, 5); // "18:00:00" -> "18:00"
}

interface GymClassCardProps {
  cls: GymClassData;
}

// Tarjeta de clase con el mismo estilo neón que las de sede (ver
// .gym-class-card en globals.css): apagada en reposo, se enciende con el
// halo #ccff00 al hover/focus/tap. Acá no hay nada que revelar — a
// diferencia de las sedes, todo el contenido ya está siempre visible.
// El tap en mobile prende el halo por un instante y se apaga solo (no
// pausa el auto-scroll del carrusel de forma permanente; eso ya lo maneja
// el track del carrusel con touchstart/touchend).
export function GymClassCard({ cls }: GymClassCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Estado 100% local y efímero: NO se guarda en gym_member_classes ni en
  // ninguna otra tabla. Es solo la confirmación visual que pidió el cliente,
  // igual que "Finalizar compra" en el carrito de Fidelity Ventas. La tabla
  // gym_member_classes ya tiene registros reales de prueba (gym@gmail.com en
  // Yoga y Cross Funcional) y este botón nunca los toca ni crea nuevos.
  const [joined, setJoined] = useState(false);

  function handleTap() {
    setIsOpen(true);
    window.setTimeout(() => setIsOpen(false), 1600);
  }

  return (
    <div
      className={`gym-class-card flex flex-col h-full ${isOpen ? "is-open" : ""}`}
      onClick={handleTap}
    >
      <div className="gym-class-card-photo h-32 relative shrink-0">
        {cls.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.photo_url} alt={cls.name} className="w-full h-full object-cover" />
        ) : (
          <ClassPlaceholder name={cls.name} />
        )}
        {cls.intensity && (
          <span className="absolute top-2 right-2 z-[1] text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-stone-700 px-2 py-1 rounded-full">
            {cls.intensity}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div>
          {cls.category && (
            <p className="gym-class-card-category text-[11px] font-semibold uppercase tracking-wide">
              {cls.category}
            </p>
          )}
          <h3 className="gym-class-card-name font-semibold leading-tight">{cls.name}</h3>
        </div>

        <div className="space-y-0.5 flex-1">
          {cls.schedule.slice(0, 3).map((s) => (
            <p key={s.id} className="gym-class-card-schedule text-xs">
              {DAY_LABELS[s.day_of_week]} {formatTime(s.start_time)} · {s.location_name}
            </p>
          ))}
          {cls.schedule.length === 0 && (
            <p className="gym-class-card-schedule text-xs">Horarios a confirmar</p>
          )}
        </div>

        {joined ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4" />
            ¡Anotado!
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setJoined(true);
            }}
            className="gym-class-btn"
          >
            <CalendarPlus className="w-4 h-4" />
            Anotarme
          </button>
        )}
      </div>
    </div>
  );
}
