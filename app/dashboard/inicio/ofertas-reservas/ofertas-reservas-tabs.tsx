"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OfertasManager, type OfferRow } from "@/app/dashboard/ofertas/ofertas-manager";
import { ReservasManager, type ReservationRow } from "@/app/dashboard/reservas/reservas-manager";

interface OfertasReservasTabsProps {
  offers: OfferRow[];
  reservations: ReservationRow[];
  // Kapusta: estilo "simil vidrio" en tarjetas y pestañas.
  glass?: boolean;
}

// Fase reorganizar panel: pantalla combinada para el botón "Ofertas/
// Reservas" del panel del agente — reusa OfertasManager y ReservasManager
// tal cual (las 3 acciones de ofertas + las 2 de reservas siguen viviendo
// ahí, sin tocarlas), este componente solo decide cuál de las dos se
// muestra. Pestañas en vez de secciones apiladas (Gate 0): las dos listas
// pueden ser largas por separado, apilarlas obligaría a un scroll doble
// sin necesidad.
export function OfertasReservasTabs({ offers, reservations, glass = false }: OfertasReservasTabsProps) {
  const [tab, setTab] = useState<"ofertas" | "reservas">("ofertas");

  const tabBtnClass = (active: boolean) =>
    glass
      ? cn(
          "px-4 py-2 text-sm font-medium rounded-xl transition-colors",
          active ? "kap-glass text-[#0B1417]" : "text-[#0B1417]/60 hover:bg-black/5"
        )
      : cn(
          "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
          active ? "bg-amber-100 text-amber-700" : "text-stone-500 hover:bg-stone-100"
        );

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button type="button" className={tabBtnClass(tab === "ofertas")} onClick={() => setTab("ofertas")}>
          Ofertas
          {offers.length > 0 && <span className="ml-1.5 text-xs opacity-70">({offers.length})</span>}
        </button>
        <button type="button" className={tabBtnClass(tab === "reservas")} onClick={() => setTab("reservas")}>
          Reservas
          {reservations.length > 0 && (
            <span className="ml-1.5 text-xs opacity-70">({reservations.length})</span>
          )}
        </button>
      </div>

      {tab === "ofertas" ? (
        <OfertasManager offers={offers} glass={glass} />
      ) : (
        <ReservasManager reservations={reservations} glass={glass} />
      )}
    </div>
  );
}
