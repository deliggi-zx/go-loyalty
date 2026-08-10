"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CornerReserveModal } from "./corner-reserve-modal";
import type { CornerCourt } from "./corner-data";

interface CornerReserveContextValue {
  openReserve: () => void;
}

const CornerReserveContext = createContext<CornerReserveContextValue | null>(null);

// Único punto de entrada para abrir el modal de reserva (Fase 4) — mismo
// criterio que getReserveHref (ajuste fino de Fase 2, ahora reemplazado):
// los 3 disparadores ("Reservar" en la home, "Reservas" y el ícono central
// del bottom nav) llaman a este mismo hook en vez de decidir cada uno por
// su cuenta cómo abrir la reserva. layout.tsx monta este provider una sola
// vez envolviendo todo Corner, así que el modal es una única instancia
// compartida — abrir desde cualquiera de los 3 lugares abre la misma.
export function CornerReserveProvider({
  courts,
  children,
}: {
  courts: CornerCourt[];
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CornerReserveContext.Provider value={{ openReserve: () => setIsOpen(true) }}>
      {children}
      <CornerReserveModal courts={courts} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </CornerReserveContext.Provider>
  );
}

export function useCornerReserve(): CornerReserveContextValue {
  const ctx = useContext(CornerReserveContext);
  if (!ctx) {
    throw new Error("useCornerReserve debe usarse dentro de CornerReserveProvider");
  }
  return ctx;
}
