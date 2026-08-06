"use client";

import { useState } from "react";

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
    id: "clases",
    title: "Clases",
    blurb: "Funcional, spinning, yoga y más — elegí tu ritmo.",
    target: "clases",
  },
  {
    id: "planes",
    title: "Planes",
    blurb: "Mensual, trimestral o anual — muy pronto.",
    target: null,
  },
];

// Pestañas neón verticales ancladas al borde izquierdo del video del hero.
// En reposo son solo franjas de vidrio coloreado, sin texto (ver .neon-tab
// en globals.css); al hacer hover o tap "se encienden" y revelan título +
// frase. Un tap en mobile expande y navega en el mismo gesto, sin necesidad
// de un segundo toque. La pestaña "Planes" todavía no tiene sección propia,
// así que se ve pero no navega a ningún lado.
export function NeonTabs() {
  const [openId, setOpenId] = useState<string | null>(null);

  function handleActivate(tab: NeonTabConfig) {
    setOpenId(tab.id);
    if (tab.target) {
      document.getElementById(tab.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.setTimeout(() => {
      setOpenId((current) => (current === tab.id ? null : current));
    }, 1600);
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
