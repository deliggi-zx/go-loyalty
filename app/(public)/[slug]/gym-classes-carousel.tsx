"use client";

import { useEffect, useRef } from "react";
import { GymClassCard } from "./gym-class-card";
import type { GymClassData } from "./gym-data";

const SPEED_PX_PER_FRAME = 0.6;

interface GymClassesCarouselProps {
  classes: GymClassData[];
  primaryColor: string;
}

export function GymClassesCarousel({ classes, primaryColor }: GymClassesCarouselProps) {
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
      className="flex gap-4 overflow-x-hidden pb-1"
    >
      {classes.map((cls) => (
        <div key={cls.id} className="shrink-0 w-60">
          <GymClassCard cls={cls} primaryColor={primaryColor} />
        </div>
      ))}
    </div>
  );
}
