"use client";

import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { CatalogImage } from "./data";

interface ProductImageCarouselProps {
  images: CatalogImage[];
  alt: string;
  primaryColor: string;
  // Fase 3: extraído de ProductModal (que ya lo usaba) para reusarlo tal
  // cual en la ficha de producto nueva (/[slug]/producto/[id]) — mismo
  // swipe táctil, flechas, contador y dots, sin cambio de comportamiento
  // en el modal. `className` solo controla el contenedor de la imagen
  // (aspect ratio / bordes); el resto (flechas, dots) es fijo.
  className?: string;
}

export function ProductImageCarousel({
  images: unsortedImages,
  alt,
  primaryColor,
  className = "aspect-square",
}: ProductImageCarouselProps) {
  const images = [...unsortedImages].sort((a, b) => a.display_order - b.display_order);
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function goTo(index: number) {
    setCurrent((index + images.length) % images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const threshold = 40;
    if (deltaX > threshold) goTo(current - 1);
    else if (deltaX < -threshold) goTo(current + 1);
  }

  return (
    <>
      <div
        className={`relative w-full bg-stone-100 overflow-hidden ${className}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.length > 0 ? (
          images.map((img, i) => (
            <div
              key={img.id}
              className="absolute inset-0 transition-opacity duration-300"
              style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
            >
              {/* Fase video (Domus): mezclado en la misma galería que las
                  fotos, por display_order — sin autoplay (el visitante
                  cambia de slide con las flechas/dots/swipe de siempre,
                  el video no arranca solo). preload="metadata" en vez de
                  "auto" para no descargar los N videos enteros de una
                  propiedad con varios, ya que todos quedan montados a la
                  vez (solo el actual es visible, ver opacity arriba). */}
              {img.media_type === "video" ? (
                <video
                  src={img.image_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.image_url} alt={alt} className="w-full h-full object-cover" />
              )}
            </div>
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-stone-300" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={() => goTo(current - 1)}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-stone-700 text-lg transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => goTo(current + 1)}
              aria-label="Siguiente imagen"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-stone-700 text-lg transition-colors"
            >
              ›
            </button>
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium">
              {current + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-4 pt-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => goTo(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className="transition-all rounded-full"
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                backgroundColor: i === current ? primaryColor : "#d6d3d1",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
