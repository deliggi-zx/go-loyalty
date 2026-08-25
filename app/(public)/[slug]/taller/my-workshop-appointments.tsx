"use client";

import { useState, useTransition } from "react";
import { cancelWorkshopAppointmentAsClient } from "../bike-workshop-actions";

export interface MyWorkshopAppointmentRow {
  id: string;
  date: string;
  time: string;
  description: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  // Calculado en el server (status en pending/confirmed && fecha >= hoy)
  // — ver taller/page.tsx. Mismo criterio que canCancel en MyVisitsList
  // (Domus), no se recalcula acá.
  canCancel: boolean;
}

interface MyWorkshopAppointmentsProps {
  slug: string;
  appointments: MyWorkshopAppointmentRow[];
}

const STATUS_LABEL: Record<MyWorkshopAppointmentRow["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const STATUS_BADGE_CLASS: Record<MyWorkshopAppointmentRow["status"], string> = {
  pending: "bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/30",
  confirmed: "bg-emerald-950/40 text-emerald-400",
  rejected: "bg-[#26262a] text-[#9b9995]",
  cancelled: "bg-[#26262a] text-[#9b9995]",
};

function formatDate(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Fase T3: mismo patrón que MyVisitsList (Domus) — card oscura por fila,
// badge de estado, "Cancelar" solo si canCancel. Vive en /bike/taller (no
// en /perfil) porque esta es la pantalla dedicada del feature, ver Gate 0.
export function MyWorkshopAppointments({ slug, appointments: initialAppointments }: MyWorkshopAppointmentsProps) {
  const [isPending, startTransition] = useTransition();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleCancel(id: string) {
    if (!confirm("¿Cancelar este turno? El horario queda libre para otro cliente.")) return;
    setCancellingId(id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const, canCancel: false } : a))
    );
    startTransition(async () => {
      await cancelWorkshopAppointmentAsClient(slug, id);
      setCancellingId(null);
    });
  }

  if (appointments.length === 0) {
    return <p className="text-xs text-[#6b6965]">Todavía no pediste ningún turno.</p>;
  }

  return (
    <div className="bg-[#0a0a0b] divide-y divide-[#26262a] border border-[#26262a] rounded-lg overflow-hidden">
      {appointments.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-[#9b9995]">
              {formatDate(a.date)} · {a.time}
            </p>
            <p className="text-[#d8d6d2] truncate">{a.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE_CLASS[a.status]}`}
            >
              {STATUS_LABEL[a.status]}
            </span>
            {a.canCancel && (
              <button
                type="button"
                disabled={isPending && cancellingId === a.id}
                onClick={() => handleCancel(a.id)}
                className="text-xs font-medium text-[#ff6b00] hover:text-[#ff8c33] disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
