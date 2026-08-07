"use client";

import { useRef, useState } from "react";

interface NeonTabConfig {
  id: string;
  title: string;
  blurb: string;
  target: string | null; // id de la sección a la que navega; null = sin destino todavía
}

const TABS: NeonTabConfig[] = [
  {
    id: "quienes-somos",
    title: "Quiénes Somos",
    blurb: "La energía que nos mueve, en cada sede.",
    target: "quienes-somos",
  },
  {
    id: "sedes",
    title: "Sucursales",
    blurb: "Encontrá la sede más cercana a vos.",
    target: "sedes",
  },
  {
    id: "clases",
    title: "Clases",
    blurb: "Funcional, spinning, yoga y más — elegí tu ritmo.",
    target: "clases",
  },
  {
    id: "planes",
    title: "Planes",
    blurb: "Mensual, anual o flex — elegí el tuyo.",
    target: "planes",
  },
];

// Pestañas neón verticales ancladas al borde izquierdo del video del hero.
// En reposo son solo franjas de vidrio coloreado, sin texto (ver .neon-tab
// en globals.css); al hacer hover o tap "se encienden" y revelan título +
// frase.
//
// Desktop: el hover ya desplegó la pestaña antes del click, así que un
// click siempre navega directo (nada que cambiar acá, lo resuelve el CSS).
//
// Mobile/táctil (sin hover real): el primer toque solo enciende/despliega
// la pestaña, igual que el hover en desktop, sin navegar. Recién el
// segundo toque — con esa misma pestaña ya desplegada — navega a la
// sección. Tocar otra pestaña la despliega a ella (sin navegar) y apaga la
// anterior. Si no llega un segundo toque, se apaga sola.
export function NeonTabs() {
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose(tabId: string, delay: number) {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setOpenId((current) => (current === tabId ? null : current));
    }, delay);
  }

  function navigate(tab: NeonTabConfig) {
    setOpenId(tab.id);
    if (tab.target) {
      document.getElementById(tab.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scheduleClose(tab.id, 1600);
  }

  function handleActivate(tab: NeonTabConfig) {
    const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

    if (isTouch && openId !== tab.id) {
      // Primer toque en mobile: solo despliega/enciende, todavía no navega.
      // Le damos más margen que al cierre post-navegación para que haya
      // tiempo de dar el segundo toque.
      setOpenId(tab.id);
      scheduleClose(tab.id, 3000);
      return;
    }

    // Desktop, o segundo toque sobre la pestaña ya desplegada en mobile.
    navigate(tab);
  }

  return (
    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 sm:gap-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleActivate(tab)}
          className={`neon-tab ${openId === tab.id ? "is-open" : ""} ${
            tab.target ? "cursor-pointer" : "cursor-not-allowed"
          }`}
          aria-label={tab.target ? tab.title : `${tab.title} (muy pronto)`}
        >
          <span className="neon-tab-glow" aria-hidden="true" />
          <span className="neon-tab-open">
            <strong>{tab.title}</strong>
            <em>{tab.blurb}</em>
          </span>
        </button>
      ))}
    </div>
  );
}
