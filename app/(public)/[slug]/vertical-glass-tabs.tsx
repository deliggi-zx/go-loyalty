"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { SectionNavTabItem } from "./section-nav-tabs";

interface VerticalGlassTabsProps {
  leftItems: SectionNavTabItem[];
  rightItems: SectionNavTabItem[];
}

// Generalización de NeonTabs (ver neon-tabs.tsx) para poder anclar pestañas
// verticales de vidrio a CUALQUIER costado del video, no solo a la
// izquierda, y con el acento naranja de bike (--accent-bike, .glass-tab en
// globals.css) en vez del verde-limón de Gym2. Misma anatomía "letrero
// apagado → se enciende con hover/tap" y misma lógica de doble-tap en
// mobile (primer toque despliega sin navegar, segundo toque navega).
//
// Reusa SectionNavTabItem en vez de un tipo propio: targetId hace scroll
// suave dentro de esta página, href navega a otra ruta (ej. Catálogo →
// /[slug]/precios) — para href, el gate de doble-tap se resuelve con
// preventDefault en el primer toque en vez de scrollIntoView.
//
// NO modifica ni reemplaza NeonTabs — Gym2 sigue usándolo tal cual, solo a
// la izquierda, con sus propias Sedes/Clases/Planes.
function GlassTabGroup({ items, side }: { items: SectionNavTabItem[]; side: "left" | "right" }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose(label: string, delay: number) {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setOpenLabel((current) => (current === label ? null : current));
    }, delay);
  }

  // true = este toque solo desplegó la pestaña (primer tap en mobile), el
  // caller no debe navegar/hacer scroll todavía.
  function firstTouchGate(item: SectionNavTabItem): boolean {
    const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
    if (isTouch && openLabel !== item.label) {
      setOpenLabel(item.label);
      scheduleClose(item.label, 3000);
      return true;
    }
    return false;
  }

  function handleScrollClick(item: SectionNavTabItem) {
    if (firstTouchGate(item)) return;
    setOpenLabel(item.label);
    if (item.targetId) {
      document.getElementById(item.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scheduleClose(item.label, 1600);
  }

  function handleLinkClick(e: React.MouseEvent, item: SectionNavTabItem) {
    if (firstTouchGate(item)) {
      e.preventDefault();
    }
  }

  const positionClass = side === "left" ? "left-0" : "right-0";
  const sideClass = side === "left" ? "glass-tab-left" : "glass-tab-right";
  // El contenedor no tiene ancho explícito (shrink-to-fit al hijo más ancho
  // en cada momento) — para el grupo derecho eso hacía que, al expandirse
  // una pestaña, la otra (con align-items:flex-start por default) quedara
  // alineada contra el borde IZQUIERDO del contenedor ahora más ancho, en
  // vez de contra el borde derecho real del video. items-end (flex-end)
  // ancla cada pestaña a su propio borde, independiente del ancho que tenga
  // su par en ese momento. El grupo izquierdo ya estaba bien con el default
  // (flex-start = izquierda, coincide con su lado).
  const alignClass = side === "right" ? "items-end" : "";

  return (
    <div
      className={`absolute ${positionClass} top-1/2 -translate-y-1/2 z-20 flex flex-col ${alignClass} gap-1.5 sm:gap-3`}
    >
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            onClick={(e) => handleLinkClick(e, item)}
            className={`glass-tab ${sideClass} ${openLabel === item.label ? "is-open" : ""}`}
            aria-label={item.label}
          >
            <span className="glass-tab-glow" aria-hidden="true" />
            <span className="glass-tab-open">
              <strong>{item.label}</strong>
              {item.subtitle && <em>{item.subtitle}</em>}
            </span>
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={() => handleScrollClick(item)}
            className={`glass-tab ${sideClass} ${openLabel === item.label ? "is-open" : ""}`}
            aria-label={item.label}
          >
            <span className="glass-tab-glow" aria-hidden="true" />
            <span className="glass-tab-open">
              <strong>{item.label}</strong>
              {item.subtitle && <em>{item.subtitle}</em>}
            </span>
          </button>
        )
      )}
    </div>
  );
}

export function VerticalGlassTabs({ leftItems, rightItems }: VerticalGlassTabsProps) {
  return (
    <>
      {leftItems.length > 0 && <GlassTabGroup items={leftItems} side="left" />}
      {rightItems.length > 0 && <GlassTabGroup items={rightItems} side="right" />}
    </>
  );
}
