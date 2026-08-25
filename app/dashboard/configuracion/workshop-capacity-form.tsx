"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorkshopCapacity } from "./actions";

interface WorkshopCapacityOrgData {
  workshop_capacity_per_slot: number | null;
}

interface WorkshopCapacityFormProps {
  org: WorkshopCapacityOrgData;
}

// Fase T1 "Mundo Bike" Taller: cuántas bicis en simultáneo entran en cada
// bloque de 30 min de disponibilidad (ver /dashboard/taller). Mismo
// patrón que RequirementsForm (Domus) — bloque propio, solo se monta para
// orgSlug === 'bike' (ver page.tsx).
export function WorkshopCapacityForm({ org }: WorkshopCapacityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [capacity, setCapacity] = useState(String(org.workshop_capacity_per_slot ?? 2));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const parsed = Number(capacity);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError("Ingresá un número entero mayor a 0.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await updateWorkshopCapacity(parsed);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Capacidad del taller
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Cuántas bicis pueden entrar en simultáneo en cada bloque horario de disponibilidad.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Bicis por turno</label>
          <input
            type="number"
            min={1}
            step={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-24 h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar capacidad"}
        </button>
      </div>
    </section>
  );
}
