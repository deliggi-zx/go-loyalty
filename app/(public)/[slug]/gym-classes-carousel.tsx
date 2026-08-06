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

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function step() {
      if (track && !pausedRef.current) {
        const max = track.scrollWidth - track.clientWidth;
        if (max > 0) {
          track.scrollLeft += directionRef.current * SPEED_PX_PER_FRAME;
          // Efecto ping-pong: rebota en los extremos en vez de saltar al inicio.
          if (track.scrollLeft >= max) directionRef.current = -1;
          if (track.scrollLeft <= 0) directionRef.current = 1;
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
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
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
