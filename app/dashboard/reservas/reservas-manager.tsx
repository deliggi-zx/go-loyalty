"use client";

import { useState, useTransition } from "react";
import { confirmReservation, rejectReservation } from "./actions";

export interface ReservationRow {
  id: string;
  clientName: string;
  phone: string;
  propertyName: string;
  createdAt: string;
}

interface ReservasManagerProps {
  reservations: ReservationRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mismo espíritu simple que OfertasManager/ConsultasManager: solo lectura
// + dos acciones de estado, sacando la fila de la lista en cuanto se
// confirma o rechaza (esta pantalla solo muestra pendientes — una vez
// resuelta, ya no pertenece acá).
export function ReservasManager({ reservations: initialReservations }: ReservasManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [reservations, setReservations] = useState(initialReservations);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function handleConfirm(id: string) {
    setUpdatingId(id);
    startTransition(async () => {
      await confirmReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setUpdatingId(null);
    });
  }

  function handleReject(id: string) {
    setUpdatingId(id);
    startTransition(async () => {
      await rejectReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setUpdatingId(null);
    });
  }

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
        No hay reservas pendientes.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {reservations.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-stone-900">{r.propertyName}</p>
            <p className="text-xs text-stone-500">
              {r.clientName} · {r.phone}
            </p>
            <p className="text-xs text-stone-400">{formatDate(r.createdAt)}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending && updatingId === r.id}
              onClick={() => handleConfirm(r.id)}
              className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
            >
              Confirmar reserva
            </button>
            <button
              type="button"
              disabled={isPending && updatingId === r.id}
              onClick={() => handleReject(r.id)}
              className="text-xs font-medium text-stone-500 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
