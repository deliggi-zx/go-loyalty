"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Botón flotante circular arrastrable con el dedo (o el mouse). Reusable:
// hoy lo usan el acceso a calculadoras y el chat de IA de Kapusta (ver
// kapusta-floating-dock.tsx), ambos scoped a esa org.
//
// - Distingue tap corto de arrastre: se considera arrastre recién cuando
//   el puntero se movió más de DRAG_THRESHOLD px desde el pointerdown.
//   Un tap sin arrastre dispara onTap.
// - Mientras no hay arrastre, el gesto no se captura, así el scroll normal
//   de la página sigue funcionando aunque el toque haya arrancado sobre el
//   botón.
// - La posición elegida se guarda en localStorage (por storageKey) y se
//   restaura en la próxima visita. No usa cuenta de usuario.
// - El botón nunca queda fuera del viewport: se clampa al soltar y en cada
//   resize / cambio de orientación.

const DRAG_THRESHOLD = 8; // px
const EDGE_MARGIN = 12; // px de aire mínimo contra los bordes
const FAB_SIZE = 56; // w-14 h-14

type DefaultCorner = "bottom-left" | "bottom-right";

interface DraggableFabProps {
  storageKey: string;
  defaultCorner: DefaultCorner;
  ariaLabel: string;
  onTap: () => void;
  children: ReactNode;
  /** Color de fondo del círculo (inline, igual criterio que el resto del sitio). */
  backgroundColor: string;
  /** px extra desde el borde inferior para la posición por defecto (para no
   *  pisar otros elementos fijos). */
  defaultBottomOffset?: number;
}

interface Pos {
  x: number;
  y: number;
}

function clamp(pos: Pos): Pos {
  if (typeof window === "undefined") return pos;
  const maxX = window.innerWidth - FAB_SIZE - EDGE_MARGIN;
  const maxY = window.innerHeight - FAB_SIZE - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(pos.x, EDGE_MARGIN), Math.max(EDGE_MARGIN, maxX)),
    y: Math.min(Math.max(pos.y, EDGE_MARGIN), Math.max(EDGE_MARGIN, maxY)),
  };
}

function defaultPos(corner: DefaultCorner, bottomOffset: number): Pos {
  const y = window.innerHeight - FAB_SIZE - EDGE_MARGIN - bottomOffset;
  const x =
    corner === "bottom-right" ? window.innerWidth - FAB_SIZE - EDGE_MARGIN : EDGE_MARGIN;
  return clamp({ x, y });
}

export function DraggableFab({
  storageKey,
  defaultCorner,
  ariaLabel,
  onTap,
  children,
  backgroundColor,
  defaultBottomOffset = 0,
}: DraggableFabProps) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);

  // Ref con el estado vivo del gesto en curso — no dispara renders.
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  // Posición inicial: localStorage si hay algo guardado y válido, si no la
  // esquina por defecto. Se resuelve en efecto (necesita window).
  useEffect(() => {
    let initial: Pos | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          initial = clamp(parsed);
        }
      }
    } catch {
      /* localStorage no disponible / JSON corrupto → esquina por defecto */
    }
    setPos(initial ?? defaultPos(defaultCorner, defaultBottomOffset));
  }, [storageKey, defaultCorner, defaultBottomOffset]);

  // Re-clamp en resize / rotación para que nunca quede fuera de pantalla.
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clamp(p) : p));
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!pos || e.button !== 0) return;
      gesture.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
      };
    },
    [pos]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if (!g.moved) {
      g.moved = true;
      setDragging(true);
      try {
        (e.currentTarget as HTMLButtonElement).setPointerCapture(g.pointerId);
      } catch {
        /* no-op */
      }
    }
    e.preventDefault();
    setPos(clamp({ x: g.originX + dx, y: g.originY + dy }));
  }, []);

  const endGesture = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      gesture.current = null;

      if (g.moved) {
        setDragging(false);
        try {
          (e.currentTarget as HTMLButtonElement).releasePointerCapture(g.pointerId);
        } catch {
          /* no-op */
        }
        setPos((p) => {
          if (p) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(p));
            } catch {
              /* no-op */
            }
          }
          return p;
        });
      } else {
        // Tap limpio, sin arrastre.
        onTap();
      }
    },
    [onTap, storageKey]
  );

  if (!pos) return null;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      className="fixed z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg select-none"
      style={{
        left: pos.x,
        top: pos.y,
        backgroundColor,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        transition: dragging ? "none" : "transform 120ms ease",
        transform: dragging ? "scale(1.05)" : "scale(1)",
      }}
    >
      {children}
    </button>
  );
}
