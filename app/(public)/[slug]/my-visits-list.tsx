"use client";

import { useState, useTransition } from "react";
import { cancelVisitAsClient } from "./domus-visits-actions";

export interface MyVisitRow {
  id: string;
  propertyName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  // Calculado en el server (status en pending/confirmed && fecha >= hoy)
  // — ver perfil/page.tsx. No se recalcula acá para no duplicar el
  // criterio de "hoy" en dos lugares (mismo espíritu que todayLocalYmd
  // centralizado).
  canCancel: boolean;
}

interface MyVisitsListProps {
  slug: string;
  visits: MyVisitRow[];
  primaryColor: string;
}

const STATUS_LABEL: Record<MyVisitRow["status"], string> = {
  pending: "Esperando confirmación",
  confirmed: "Confirmada",
  rejected: "No disponible",
  cancelled: "Cancelada",
};

const STATUS_BADGE_CLASS: Record<MyVisitRow["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-stone-100 text-stone-500",
  cancelled: "bg-stone-100 text-stone-500",
};

function formatDate(dateYmd: string): string {
  return new Date(`${dateYmd}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Fase 5: mismo criterio visual que VetMyPets (cards blancas con borde,
// título uppercase chico) — la única interacción es cancelar una visita
// futura y confirmada, ver cancelVisitAsClient en domus-visits-actions.ts.
export function MyVisitsList({ slug, visits: initialVisits, primaryColor }: MyVisitsListProps) {
  const [isPending, startTransition] = useTransition();
  const [visits, setVisits] = useState(initialVisits);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleCancel(id: string) {
    if (!confirm("¿Cancelar esta visita? El horario queda libre para otro cliente.")) return;
    setCancellingId(id);
    setVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "cancelled" as const, canCancel: false } : v))
    );
    startTransition(async () => {
      await cancelVisitAsClient(slug, id);
      setCancellingId(null);
    });
  }

  if (visits.length === 0) {
    return <p className="text-xs text-stone-400">Todavía no pediste ninguna visita.</p>;
  }

  return (
    <div className="bg-white divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
      {visits.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-stone-900 truncate">{v.propertyName}</p>
            <p className="text-xs text-stone-500">
              {formatDate(v.date)} · {v.time}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE_CLASS[v.status]}`}
            >
              {STATUS_LABEL[v.status]}
            </span>
            {v.canCancel && (
              <button
                type="button"
                disabled={isPending && cancellingId === v.id}
                onClick={() => handleCancel(v.id)}
                className="text-xs font-medium disabled:opacity-50 transition-colors"
                style={{ color: primaryColor }}
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
