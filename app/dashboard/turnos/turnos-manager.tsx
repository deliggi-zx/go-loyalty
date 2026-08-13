"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { appointmentReasonLabel } from "@/app/(public)/[slug]/vet-appointments-config";
import { cancelAppointment } from "./actions";

export interface AppointmentRow {
  id: string;
  petName: string;
  ownerName: string;
  reason: string;
  date: string;
  time: string;
}

interface TurnosManagerProps {
  appointments: AppointmentRow[];
}

// Punto 4: solo lectura + cancelar, nada de crear/editar desde acá (eso
// es del wizard del dueño, ver vet-turnos-booking.tsx) — mismo espíritu
// que "el dueño solo se vincula con el código" en mascotas-manager.tsx,
// pero al revés: acá el vet/admin solo puede liberar un horario, no
// agendar otro en su lugar.
export function TurnosManager({ appointments }: TurnosManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimista: mismo patrón que canchas-manager.tsx (confirm() + sacar de
  // la lista de una + router.refresh() de fondo) — cancelar es la única
  // acción acá, no hay nada más que perder si el usuario se arrepiente a
  // mitad de camino (no hay "deshacer", coherente con que el pedido no lo
  // pidió).
  const [rows, setRows] = useState(appointments);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleCancel(id: string) {
    if (!confirm("¿Cancelar este turno? El horario queda libre para otro dueño.")) return;
    setCancellingId(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await cancelAppointment(id);
      setCancellingId(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
        <p className="text-sm text-stone-400">No hay turnos próximos.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
            <th className="px-5 py-3">Fecha</th>
            <th className="px-5 py-3">Horario</th>
            <th className="px-5 py-3">Mascota</th>
            <th className="px-5 py-3">Dueño</th>
            <th className="px-5 py-3">Motivo</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.id} className="text-stone-700">
              <td className="px-5 py-3 whitespace-nowrap">
                {new Date(`${row.date}T00:00:00`).toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td className="px-5 py-3 whitespace-nowrap font-medium">{row.time}</td>
              <td className="px-5 py-3">{row.petName}</td>
              <td className="px-5 py-3">{row.ownerName}</td>
              <td className="px-5 py-3">{appointmentReasonLabel(row.reason)}</td>
              <td className="px-5 py-3 text-right">
                <button
                  type="button"
                  disabled={isPending && cancellingId === row.id}
                  onClick={() => handleCancel(row.id)}
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
  );
}
