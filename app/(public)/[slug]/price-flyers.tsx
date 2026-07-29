"use client";

import { useRef, useState } from "react";

interface FlyerItem {
  id: string;
  image_url: string | null;
}

export function PriceFlyers({ items }: { items: FlyerItem[] }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const threshold = 40;
    if (deltaX > threshold) {
      setCurrent((c) => (c - 1 + items.length) % items.length);
    } else if (deltaX < -threshold) {
      setCurrent((c) => (c + 1) % items.length);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="w-full space-y-3 py-2">
      <div
        className="relative w-full overflow-hidden bg-stone-100"
        style={{ height: "70vh" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
          >
            {item.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt=""
                className="w-full h-full object-contain"
              />
            )}
          </div>
        ))}

        {items.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-stone-600 transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % items.length)}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center text-stone-600 transition-colors"
            >
              ›
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="transition-all rounded-full"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                backgroundColor: i === current ? "#78716c" : "#d6d3d1",
              }}
              aria-label={`Flyer ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
