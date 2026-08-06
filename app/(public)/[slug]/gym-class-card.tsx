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
  primaryColor: string;
}

export function GymClassCard({ cls, primaryColor }: GymClassCardProps) {
  // Estado 100% local y efímero: NO se guarda en gym_member_classes ni en
  // ninguna otra tabla. Es solo la confirmación visual que pidió el cliente,
  // igual que "Finalizar compra" en el carrito de Fidelity Ventas. La tabla
  // gym_member_classes ya tiene registros reales de prueba (gym@gmail.com en
  // Yoga y Cross Funcional) y este botón nunca los toca ni crea nuevos.
  const [joined, setJoined] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col h-full">
      <div className="h-32 relative shrink-0">
        {cls.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.photo_url} alt={cls.name} className="w-full h-full object-cover" />
        ) : (
          <ClassPlaceholder name={cls.name} />
        )}
        {cls.intensity && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-stone-700 px-2 py-1 rounded-full">
            {cls.intensity}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div>
          {cls.category && (
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>
              {cls.category}
            </p>
          )}
          <h3 className="font-semibold text-stone-900 leading-tight">{cls.name}</h3>
        </div>

        <div className="space-y-0.5 flex-1">
          {cls.schedule.slice(0, 3).map((s) => (
            <p key={s.id} className="text-xs text-stone-500">
              {DAY_LABELS[s.day_of_week]} {formatTime(s.start_time)} · {s.location_name}
            </p>
          ))}
          {cls.schedule.length === 0 && (
            <p className="text-xs text-stone-400">Horarios a confirmar</p>
          )}
        </div>

        {joined ? (
          <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4" />
            ¡Anotado!
          </div>
        ) : (
          <button
            onClick={() => setJoined(true)}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <CalendarPlus className="w-4 h-4" />
            Anotarme
          </button>
        )}
      </div>
    </div>
  );
}
