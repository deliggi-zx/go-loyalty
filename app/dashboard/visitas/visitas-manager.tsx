"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAvailability, cancelVisit, removeAvailability } from "./actions";

export interface VisitRow {
  id: string;
  propertyName: string;
  clientName: string;
  phone: string | null;
  date: string;
  time: string;
}

export interface AvailabilityRow {
  id: string;
  date: string;
  time: string;
}

interface VisitasManagerProps {
  visits: VisitRow[];
  availability: AvailabilityRow[];
}

function formatDate(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Dos secciones independientes (mismo criterio que separar Mascotas de
// Turnos en Huellitas: datos y acciones distintos, no amerita mezclarlos
// en un solo componente): agenda de visitas confirmadas (solo lectura +
// cancelar, igual que TurnosManager) y disponibilidad propia (agregar/
// quitar bloques, esto sí es nuevo — Huellitas no tiene equivalente
// porque su grilla está hardcodeada en código).
export function VisitasManager({ visits: initialVisits, availability: initialAvailability }: VisitasManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [visits, setVisits] = useState(initialVisits);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [availability, setAvailability] = useState(initialAvailability);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleCancelVisit(id: string) {
    if (!confirm("¿Cancelar esta visita? El horario queda libre para otro cliente.")) return;
    setCancellingId(id);
    setVisits((prev) => prev.filter((v) => v.id !== id));
    startTransition(async () => {
      await cancelVisit(id);
      setCancellingId(null);
      router.refresh();
    });
  }

  function handleAddAvailability() {
    if (!newDate || !newTime) return;
    setAddError(null);
    startTransition(async () => {
      const result = await addAvailability(newDate, newTime);
      if (!result.ok) {
        setAddError(
          result.error === "duplicate"
            ? "Ya cargaste ese día y horario."
            : "No pudimos cargar ese bloque."
        );
        return;
      }
      setAvailability((prev) =>
        [...prev, { id: crypto.randomUUID(), date: newDate, time: newTime }].sort((a, b) =>
          a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
        )
      );
      setNewDate("");
      setNewTime("");
      router.refresh();
    });
  }

  function handleRemoveAvailability(id: string) {
    setRemovingId(id);
    startTransition(async () => {
      const result = await removeAvailability(id);
      if (!result.ok) {
        alert("Ese horario ya tiene una visita confirmada — cancelala primero desde tu agenda.");
        setRemovingId(null);
        return;
      }
      setAvailability((prev) => prev.filter((a) => a.id !== id));
      setRemovingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Tu agenda
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">Visitas confirmadas, desde hoy en adelante</p>
        </div>

        {visits.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
            No tenés visitas agendadas.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Horario</th>
                  <th className="px-5 py-3">Propiedad</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visits.map((row) => (
                  <tr key={row.id} className="text-stone-700">
                    <td className="px-5 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium">{row.time}</td>
                    <td className="px-5 py-3">{row.propertyName}</td>
                    <td className="px-5 py-3">{row.clientName}</td>
                    <td className="px-5 py-3">{row.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={isPending && cancellingId === row.id}
                        onClick={() => handleCancelVisit(row.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Tu disponibilidad
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Los días y horarios en que podés recibir visitas — cualquier cliente los ve como opción,
            sin importar qué propiedad esté mirando.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Fecha</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Horario</label>
              <input
                type="time"
                step={1800}
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              type="button"
              disabled={!newDate || !newTime || isPending}
              onClick={handleAddAvailability}
              className="h-10 px-4 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              Agregar bloque
            </button>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}

          {availability.length === 0 ? (
            <p className="text-sm text-stone-400">Todavía no cargaste ningún horario.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availability.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700"
                >
                  {formatDate(a.date)} · {a.time}
                  <button
                    type="button"
                    disabled={isPending && removingId === a.id}
                    onClick={() => handleRemoveAvailability(a.id)}
                    className="text-stone-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    aria-label={`Quitar bloque ${formatDate(a.date)} ${a.time}`}
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
