"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";
import { promoteToProfesor, assignInstructor } from "./actions";

export interface MemberRow {
  profileId: string;
  name: string;
}

export interface ScheduleRow {
  id: string;
  className: string;
  locationName: string;
  dayLabel: string;
  timeLabel: string;
  instructorId: string | null;
}

interface ProfesoresManagerProps {
  customers: MemberRow[];
  profesores: MemberRow[];
  schedule: ScheduleRow[];
}

export function ProfesoresManager({ customers, profesores, schedule }: ProfesoresManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePromote(profileId: string) {
    startTransition(async () => {
      await promoteToProfesor(profileId);
      router.refresh();
    });
  }

  function handleAssign(scheduleId: string, value: string) {
    startTransition(async () => {
      await assignInstructor(scheduleId, value || null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {/* ── Profesores ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Profesores
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Los profesores solo van a poder ver sus propios horarios (fase futura).
            Ascendé a un socio existente para convertirlo en profesor.
          </p>
        </div>

        {profesores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profesores.map((p) => (
              <span
                key={p.profileId}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {p.name}
              </span>
            ))}
          </div>
        )}

        {customers.length > 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {customers.map((c) => (
              <div key={c.profileId} className="flex items-center gap-4 px-5 py-3">
                <span className="flex-1 text-sm text-stone-800">{c.name}</span>
                <button
                  onClick={() => handlePromote(c.profileId)}
                  disabled={isPending}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Hacer profesor
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-8 text-center text-stone-400 text-sm">
            No hay socios disponibles para ascender todavía.
          </div>
        )}
      </section>

      {/* ── Asignar horarios ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Asignar horarios
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Cada fila es un horario puntual — el mismo profesor puede repetirse en varios.
          </p>
        </div>

        {schedule.length > 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {schedule.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{s.className}</p>
                  <p className="text-xs text-stone-400">
                    {s.dayLabel} {s.timeLabel} · {s.locationName}
                  </p>
                </div>
                <select
                  value={s.instructorId ?? ""}
                  onChange={(e) => handleAssign(s.id, e.target.value)}
                  disabled={isPending}
                  className="shrink-0 h-9 px-2.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 disabled:opacity-50 transition-colors"
                >
                  <option value="">Sin asignar</option>
                  {profesores.map((p) => (
                    <option key={p.profileId} value={p.profileId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-8 text-center text-stone-400 text-sm">
            Esta organización todavía no tiene horarios cargados.
          </div>
        )}
      </section>
    </div>
  );
}
