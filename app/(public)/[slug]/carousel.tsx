"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CarouselItem {
  id: string;
  image_url: string | null;
  title: string | null;
}

export function Carousel({ items }: { items: CarouselItem[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length > 1) {
      timerRef.current = setInterval(next, 4500);
    }
  }, [items.length, next]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Slides */}
      <div className="relative overflow-hidden rounded-2xl bg-stone-100" style={{ aspectRatio: "16 / 7" }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
          >
            {item.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.title ?? ""}
                className="w-full h-full object-cover"
              />
            )}
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
                <p className="text-white text-sm font-medium drop-shadow">{item.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dots + nav */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => { setCurrent((c) => (c - 1 + items.length) % items.length); resetTimer(); }}
            className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Anterior"
          >
            ‹
          </button>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer(); }}
              className="transition-all rounded-full"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                backgroundColor: i === current ? "#78716c" : "#d6d3d1",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
          <button
            onClick={() => { next(); resetTimer(); }}
            className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
