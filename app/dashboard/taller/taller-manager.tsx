"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAvailabilityRange,
  removeAvailability,
  confirmAppointment,
  rejectAppointment,
  cancelAppointmentAsAdmin,
} from "./actions";

export interface AvailabilityRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

// Fase T3: turno pedido por un cliente — solo pending/confirmed viven acá
// (rejected/cancelled ya están cerrados, no se muestran en este panel).
export interface WorkshopAppointmentRow {
  id: string;
  clientName: string;
  date: string;
  time: string;
  description: string;
  status: "pending" | "confirmed";
}

interface TallerManagerProps {
  availability: AvailabilityRow[];
  appointments: WorkshopAppointmentRow[];
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
export function TallerManager({
  availability: initialAvailability,
  appointments: initialAppointments,
}: TallerManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [availability, setAvailability] = useState(initialAvailability);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState(initialAppointments);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);

  const days = useMemo(() => nextDays(60), []);

  useEffect(() => setAvailability(initialAvailability), [initialAvailability]);
  useEffect(() => setAppointments(initialAppointments), [initialAppointments]);

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

  // Fase T3: mismo patrón update-optimista-then-refresh que confirmVisit/
  // rejectVisit/cancelVisit en visitas-manager.tsx (Domus) — la fila sale
  // de la lista local al toque, router.refresh() trae el estado real del
  // server atrás (incluye la disponibilidad, cuyo cupo libre cambia).
  function handleConfirm(id: string) {
    setBusyAppointmentId(id);
    startTransition(async () => {
      await confirmAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a)));
      setBusyAppointmentId(null);
      router.refresh();
    });
  }

  function handleReject(id: string) {
    if (!confirm("¿Rechazar este turno? El horario queda libre para otro cliente.")) return;
    setBusyAppointmentId(id);
    startTransition(async () => {
      await rejectAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setBusyAppointmentId(null);
      router.refresh();
    });
  }

  function handleCancelConfirmed(id: string) {
    if (!confirm("¿Cancelar este turno confirmado? El horario queda libre para otro cliente.")) return;
    setBusyAppointmentId(id);
    startTransition(async () => {
      await cancelAppointmentAsAdmin(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setBusyAppointmentId(null);
      router.refresh();
    });
  }

  const pendingAppointments = appointments.filter((a) => a.status === "pending");
  const confirmedAppointments = appointments.filter((a) => a.status === "confirmed");

  return (
    <div className="max-w-3xl space-y-10">
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

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Pendientes de confirmar
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">Turnos pedidos por clientes, esperando tu respuesta</p>
        </div>

        {pendingAppointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
            No tenés turnos pendientes.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Horario</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingAppointments.map((row) => (
                  <tr key={row.id} className="text-stone-700">
                    <td className="px-5 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium">{row.time}</td>
                    <td className="px-5 py-3">{row.clientName}</td>
                    <td className="px-5 py-3 max-w-xs">{row.description}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isPending && busyAppointmentId === row.id}
                        onClick={() => handleConfirm(row.id)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 transition-colors mr-3"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={isPending && busyAppointmentId === row.id}
                        onClick={() => handleReject(row.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                      >
                        Rechazar
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
            Confirmadas
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">Turnos ya confirmados, desde hoy en adelante</p>
        </div>

        {confirmedAppointments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
            No tenés turnos confirmados.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Horario</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {confirmedAppointments.map((row) => (
                  <tr key={row.id} className="text-stone-700">
                    <td className="px-5 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium">{row.time}</td>
                    <td className="px-5 py-3">{row.clientName}</td>
                    <td className="px-5 py-3 max-w-xs">{row.description}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={isPending && busyAppointmentId === row.id}
                        onClick={() => handleCancelConfirmed(row.id)}
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
    </div>
  );
}
