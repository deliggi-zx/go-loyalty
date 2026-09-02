"use client";

import { useEffect } from "react";
import { recordVisit } from "./loyalty-actions";

// Fase fidelización Kapusta: registra un ingreso del cliente logueado, como
// mucho una vez por día. Throttle en localStorage para no llamar a la
// server action en cada navegación; el server además vuelve a chequear que
// no haya una visita de hoy antes de insertar. No renderiza nada, no suma
// puntos — solo alimenta "Última visita" / "Visitas este mes" en el panel.
export function VisitTracker({ orgId }: { orgId: string }) {
  useEffect(() => {
    const key = `kapusta:lastVisitPing:${orgId}`;
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

    let alreadyPingedToday = false;
    try {
      alreadyPingedToday = window.localStorage.getItem(key) === today;
    } catch {
      // localStorage no disponible (modo privado, etc.) — se cae al server
      // check igual, solo perdemos el throttle del cliente.
    }
    if (alreadyPingedToday) return;

    recordVisit(orgId)
      .then(() => {
        try {
          window.localStorage.setItem(key, today);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* best-effort: un ingreso perdido no es crítico */
      });
  }, [orgId]);

  return null;
}
