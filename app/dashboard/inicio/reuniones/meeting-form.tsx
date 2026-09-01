"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import { createKapustaMeeting } from "./actions";

// Botón + modal para que el empleado cargue una reunión a mano (cualquier
// tipo). No depende de que nadie la solicite. Se guarda en la base y, si
// hay Google Calendar conectado, se espeja ahí.
export function MeetingForm({ glass }: { glass: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { synced: boolean }>(null);

  function reset() {
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setNotes("");
    setError(null);
    setDone(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await createKapustaMeeting({ title, date, time, location, notes });
    setSubmitting(false);
    if (!res.ok) {
      setError(
        res.error === "invalid"
          ? "Revisá los datos: título, fecha y hora son obligatorios."
          : "No tenés permiso para cargar reuniones."
      );
      return;
    }
    setDone({ synced: res.synced });
    router.refresh();
  }

  const inputClass =
    "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors";

  const triggerClass = glass
    ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl kap-glass text-sm font-semibold text-[#0B1417]"
    : "inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        <CalendarPlus className="w-4 h-4" />
        Cargar reunión
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">Cargar reunión</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-700">
                  Reunión guardada.
                  {done.synced
                    ? " Se agregó también al Google Calendar del equipo."
                    : " (No se sincronizó con Google Calendar — quedó solo en el sistema.)"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="h-10 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
                  >
                    Cargar otra
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                  >
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Título / motivo</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Reunión con escribano · firma boleto"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Fecha</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Hora</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Lugar (opcional)</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Oficina, Av. Corrientes 1234"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Detalle libre"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim() || !date || !time}
                  className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {submitting ? "Guardando…" : "Guardar reunión"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
