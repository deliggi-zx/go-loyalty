"use client";

import { useEffect, useRef } from "react";
import { GymClassCard } from "./gym-class-card";
import type { GymClassData } from "./gym-data";

const SPEED_PX_PER_FRAME = 0.6;

interface GymClassesCarouselProps {
  classes: GymClassData[];
}

export function GymClassesCarousel({ classes }: GymClassesCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const pausedRef = useRef(false);
  const rafRef = useRef<number>();
  // Posición propia en punto flotante, en vez de leer/escribir track.scrollLeft
  // en cada frame: algunos navegadores táctiles redondean scrollLeft a enteros
  // al leerlo, y con un paso sub-píxel (0.6/frame) leer-sumar-escribir sobre
  // ese valor ya redondeado puede perder el incremento y frenar la animación.
  // Acumulando en un ref propio, solo el *write* final a scrollLeft se redondea.
  const positionRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function step() {
      if (track) {
        if (pausedRef.current) {
          // Mientras está pausado (hover/touch), seguimos leyendo la
          // posición real en vez de congelarla — si el usuario deslizó el
          // carrusel a mano (ahora es overflow-x:auto, así que se puede),
          // al reanudar el auto-scroll sigue desde ahí en vez de "pegar un
          // salto" a la posición vieja de antes del gesto.
          positionRef.current = track.scrollLeft;
        } else {
          const max = track.scrollWidth - track.clientWidth;
          if (max > 0) {
            positionRef.current += directionRef.current * SPEED_PX_PER_FRAME;
            // Efecto ping-pong: rebota en los extremos en vez de saltar al inicio.
            if (positionRef.current >= max) {
              positionRef.current = max;
              directionRef.current = -1;
            } else if (positionRef.current <= 0) {
              positionRef.current = 0;
              directionRef.current = 1;
            }
            track.scrollLeft = positionRef.current;
          }
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (classes.length === 0) return null;

  return (
    <div
      ref={trackRef}
      // Pointer Events en vez de onMouseEnter/onMouseLeave: en mobile, un
      // tap sintetiza un mouseenter "de compatibilidad" ~300ms después del
      // touchend, pero nunca un mouseleave correspondiente (no hay puntero
      // que "salga") — eso deja pausedRef en true para siempre después del
      // primer toque, que es exactamente el bug reportado ("hace el
      // recorrido una vez y se queda fijo"). Filtrando por pointerType
      // evitamos que ese mouseenter fantasma vuelva a pausar el carrusel;
      // en touch, el pause/resume lo maneja únicamente touchstart/touchend.
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") pausedRef.current = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") pausedRef.current = false;
      }}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
      // overflow-x-auto (antes overflow-x-hidden): en mobile real, asignar
      // scrollLeft por JS sobre un contenedor con overflow:hidden no anima
      // de forma confiable en todos los navegadores táctiles (funcionaba en
      // desktop, no en el celular) — overflow-x:auto + no-scrollbar (clase
      // en globals.css, oculta la barra nativa) es el patrón robusto para
      // esto y de paso permite deslizar con el dedo. Igual que antes, un eje
      // no-"visible" fuerza al otro a "auto", lo que recorta el glow de las
      // tarjetas al encenderse; el py-10 le da al halo (hasta 46px de blur)
      // el margen que necesita para no cortarse.
      className="flex gap-4 overflow-x-auto no-scrollbar py-10 -my-10"
    >
      {classes.map((cls) => (
        <div key={cls.id} className="shrink-0 w-60">
          <GymClassCard cls={cls} />
        </div>
      ))}
    </div>
  );
}
