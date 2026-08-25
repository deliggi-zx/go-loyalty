"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAvailabilityRange, removeAvailability } from "./actions";

export interface AvailabilityRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface TallerManagerProps {
  availability: AvailabilityRow[];
}

function formatDate(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Mismo "calendario simple" de tildado múltiple que nextDays() en
// dashboard/visitas/visitas-manager.tsx (Domus) — fecha local armada a
// mano (Y/M/D), no toISOString, para no correrse por huso horario.
function nextDays(n: number): { ymd: string; label: string }[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const days: { ymd: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    days.push({
      ymd,
      label: d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

// Fase T1 "Mundo Bike" Taller: solo disponibilidad por ahora (sin agenda
// de turnos — no hay reserva del lado cliente todavía, eso es la Fase
// T2). Mismo patrón de UX que la sección de disponibilidad de
// VisitasManager (Domus), implementación propia y más simple (sin
// agent_profile_id, un solo local en vez de agenda por persona).
export function TallerManager({ availability: initialAvailability }: TallerManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [availability, setAvailability] = useState(initialAvailability);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const days = useMemo(() => nextDays(60), []);

  useEffect(() => setAvailability(initialAvailability), [initialAvailability]);

  function toggleDay(ymd: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(ymd)) next.delete(ymd);
      else next.add(ymd);
      return next;
    });
  }

  function handleSaveAvailability() {
    if (selectedDays.size === 0 || !rangeStart || !rangeEnd) return;
    setSaveError(null);
    setSaveNotice(null);
    startTransition(async () => {
      const result = await addAvailabilityRange(Array.from(selectedDays), rangeStart, rangeEnd);
      if (!result.ok) {
        setSaveError("Revisá los días y el rango horario (Hasta debe ser posterior a Desde).");
        return;
      }
      setSaveNotice(
        result.skipped > 0
          ? `Se cargaron ${result.added} día${result.added === 1 ? "" : "s"} (${result.skipped} ya estaban cargados con ese mismo rango).`
          : `Se cargaron ${result.added} día${result.added === 1 ? "" : "s"}.`
      );
      setSelectedDays(new Set());
      setRangeStart("");
      setRangeEnd("");
      router.refresh();
    });
  }

  function handleRemoveAvailability(id: string) {
    setRemovingId(id);
    startTransition(async () => {
      const result = await removeAvailability(id);
      if (!result.ok) {
        alert("Ese bloque tiene un turno pendiente o confirmado encima — resolvelo primero.");
        setRemovingId(null);
        return;
      }
      setAvailability((prev) => prev.filter((a) => a.id !== id));
      setRemovingId(null);
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Disponibilidad del taller
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Tildá uno o más días y cargales un rango horario — se aplica por igual a todo el
            taller, no por mecánico. Podés repetir la carga las veces que quieras con distintos
            días y rangos.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Días</label>
            <div className="max-h-52 overflow-y-auto flex flex-wrap gap-2 p-3 rounded-lg border border-stone-100 bg-stone-50">
              {days.map((d) => {
                const selected = selectedDays.has(d.ymd);
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    onClick={() => toggleDay(d.ymd)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-stone-200 text-stone-600 hover:border-amber-300"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Desde</label>
              <input
                type="time"
                step={1800}
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Hasta</label>
              <input
                type="time"
                step={1800}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              type="button"
              disabled={selectedDays.size === 0 || !rangeStart || !rangeEnd || isPending}
              onClick={handleSaveAvailability}
              className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              Guardar disponibilidad
            </button>
            <p className="text-xs text-stone-400">{selectedDays.size} día(s) tildado(s)</p>
          </div>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          {saveNotice && <p className="text-xs text-emerald-600">{saveNotice}</p>}

          {availability.length === 0 ? (
            <p className="text-sm text-stone-400">Todavía no cargaste ningún horario.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availability.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700"
                >
                  {formatDate(a.date)} · {a.startTime}–{a.endTime}
                  <button
                    type="button"
                    disabled={isPending && removingId === a.id}
                    onClick={() => handleRemoveAvailability(a.id)}
                    className="text-stone-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    aria-label={`Quitar bloque ${formatDate(a.date)} ${a.startTime}-${a.endTime}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
