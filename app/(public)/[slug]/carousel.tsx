"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface CarouselItem {
  id: string;
  image_url: string | null;
  title: string | null;
}

interface CarouselProps {
  items: CarouselItem[];
  // "large" = contenedor más grande (Fase 3g, hoy solo "bike"). Default sin
  // cambios para el resto de las orgs (Cafetería, Bicicletería, Gym2).
  size?: "default" | "large";
  // Click en la imagen actual pausa el autoplay y abre una vista ampliada
  // sin recortar. Default false = sin cambios para el resto de las orgs.
  enableLightbox?: boolean;
  // Destino al hacer click en la imagen ya ampliada, dentro del lightbox
  // (ej. /[slug]/precios) — sin vincular a un producto puntual, evita
  // duplicar el trabajo ya hecho en "Imperdibles". Si no se pasa, la imagen
  // ampliada no es clickeable.
  lightboxHref?: string;
}

export function Carousel({
  items,
  size = "default",
  enableLightbox = false,
  lightboxHref,
}: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  // El autoplay se pausa mientras el lightbox está abierto (ver
  // lightboxOpen en las deps) — al cerrarlo, este mismo effect vuelve a
  // armar el interval y retoma normal.
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length > 1 && !lightboxOpen) {
      timerRef.current = setInterval(next, 4500);
    }
  }, [items.length, next, lightboxOpen]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

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
      resetTimer();
    } else if (deltaX < -threshold) {
      next();
      resetTimer();
    }
  }

  if (items.length === 0) return null;

  const currentItem = items[current];
  // Edge-to-edge en mobile (cancela el px-4 del contenedor padre) + tope más
  // ancho desde sm/lg — ~30-35% más grande que el max-w-lg (512px) de
  // siempre en los breakpoints donde antes sí tenía un tope.
  const sizeWrapperClass = size === "large" ? "-mx-4 sm:mx-auto sm:max-w-2xl lg:max-w-3xl" : "";

  return (
    <div className={`space-y-3 ${sizeWrapperClass}`}>
      {/* Slides */}
      <div
        className="relative overflow-hidden rounded-2xl bg-stone-100"
        style={{ aspectRatio: "16 / 7" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
                className={`w-full h-full object-cover ${enableLightbox ? "cursor-pointer" : ""}`}
                onClick={enableLightbox ? () => setLightboxOpen(true) : undefined}
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

      {/* Lightbox — solo si enableLightbox, mismo patrón de modal que
          product-modal.tsx (backdrop + botón X + z-[80]). Imagen sin
          recortar (object-contain); si hay lightboxHref, la imagen misma
          es un link (ej. al catálogo general). */}
      {lightboxOpen && currentItem?.image_url && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setLightboxOpen(false)} />

          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-700 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxHref ? (
            <Link href={lightboxHref} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentItem.image_url}
                alt={currentItem.title ?? ""}
                className="max-w-full max-h-[85vh] object-contain rounded-lg cursor-pointer"
              />
            </Link>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentItem.image_url}
              alt={currentItem.title ?? ""}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}
