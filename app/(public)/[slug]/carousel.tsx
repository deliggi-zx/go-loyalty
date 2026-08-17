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
  const length = items.length;

  // Loop infinito por deslizamiento (translateX), técnica de clones a los
  // costados (mismo mecanismo que Swiper/Slick): el track real es
  // [clon del último, ...items, clon del primero], y `position` es el
  // índice dentro de ESE array extendido (1..length = slides reales; 0 y
  // length+1 son los clones). Al terminar la transición sobre un clon,
  // saltamos sin animar a la posición real equivalente — como el clon es
  // pixel-idéntico a la imagen real, el salto es invisible y el
  // deslizamiento sigue de largo en la misma dirección en vez de rebotar.
  const [position, setPosition] = useState(1);
  const [withTransition, setWithTransition] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clamp en vez de dejar crecer position sin límite: si al usuario le da
  // por clickear la flecha varias veces seguidas antes de que el
  // useEffect de abajo corrija el salto sobre un clon, esto evita pedir un
  // índice que no existe en el array extendido (se vería un hueco en
  // blanco). En uso normal (autoplay cada 4500ms, swipe/click puntual)
  // nunca se llega a este límite.
  const next = useCallback(() => {
    setPosition((p) => Math.min(p + 1, length + 1));
  }, [length]);

  const prev = useCallback(() => {
    setPosition((p) => Math.max(p - 1, 0));
  }, []);

  // El autoplay se pausa mientras el lightbox está abierto (ver
  // lightboxOpen en las deps) — al cerrarlo, este mismo effect vuelve a
  // armar el interval y retoma normal.
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (length > 1 && !lightboxOpen) {
      timerRef.current = setInterval(next, 4500);
    }
  }, [length, next, lightboxOpen]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  // Corrige el salto apenas termina de deslizar sobre uno de los clones:
  // saca la transición (withTransition=false) y reubica `position` en la
  // posición real equivalente en el mismo tick — React 18 batchea ambos
  // setState, así que el DOM nunca pinta un frame intermedio sin
  // transición pero en la posición vieja. El effect siguiente reactiva la
  // transición en el próximo frame para el siguiente deslizamiento.
  //
  // Deliberadamente por setTimeout (duración de la transición + margen) y
  // NO por el evento `transitionend`: con la pestaña en segundo plano el
  // navegador puede saltear el pintado de la transición sin disparar ese
  // evento — y como `next`/`prev` clampean en el borde del array
  // extendido, si la corrección dependiera solo de `transitionend` el
  // carrusel quedaba trabado ahí para siempre en cuanto se le sacaba el
  // foco a la pestaña. El timeout no depende de que el navegador llegue a
  // pintar nada, así que corrige igual.
  useEffect(() => {
    if (position !== 0 && position !== length + 1) return;
    const timeout = setTimeout(() => {
      setWithTransition(false);
      setPosition(position === 0 ? length : 1);
    }, 750);
    return () => clearTimeout(timeout);
  }, [position, length]);

  useEffect(() => {
    if (withTransition) return;
    const raf = requestAnimationFrame(() => setWithTransition(true));
    return () => cancelAnimationFrame(raf);
  }, [withTransition]);

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
      prev();
      resetTimer();
    } else if (deltaX < -threshold) {
      next();
      resetTimer();
    }
  }

  if (length === 0) return null;

  // Índice real (0..length-1) derivado de `position` — sirve para los
  // dots, el resaltado activo y el lightbox. En las posiciones-clon (0 y
  // length+1) da el mismo índice que la imagen real que se está mostrando
  // ahí (last/first), así que dots y lightbox nunca quedan desincronizados
  // del clon visible mientras dura la corrección.
  const current = ((position - 1) % length + length) % length;
  const currentItem = items[current];
  const extendedItems = [items[length - 1], ...items, items[0]];
  // Edge-to-edge en mobile (cancela el px-4 del contenedor padre). Desde
  // sm crece por tramos hasta max-w-6xl (1152px) en xl — más ancho que el
  // max-w-5xl (1024px) que usa Gym2 para su propio carrusel, así que en
  // pantallas grandes ya no se ve chico al lado del resto (Fase 3i, Gate 4:
  // el techo anterior, max-w-3xl/768px, no crecía más allá de lg y quedaba
  // corto en monitores anchos).
  const sizeWrapperClass =
    size === "large" ? "-mx-4 sm:mx-auto sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl" : "";

  return (
    <div className={`space-y-3 ${sizeWrapperClass}`}>
      {/* Slides — track flex ancho = extendedItems.length * 100%, cada
          slide shrink-0 w-full; `position` corre sobre extendedItems (ver
          comentario arriba de su declaración). Los clones en los extremos
          quedan fuera del área visible (overflow-hidden) salvo durante la
          transición hacia ellos, así que no hace falta pointer-events
          manual como antes (con el stack de opacity, los slides inactivos
          ocupaban el mismo rectángulo así que había que apagarles los
          eventos a mano). */}
      <div
        className="relative overflow-hidden rounded-2xl bg-stone-100"
        style={{ aspectRatio: "16 / 7" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${position * 100}%)`,
            transition: withTransition ? "transform 700ms ease-in-out" : "none",
          }}
        >
          {extendedItems.map((item, i) => (
            <div key={i} className="relative w-full h-full shrink-0">
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
      </div>

      {/* Dots + nav */}
      {length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => { prev(); resetTimer(); }}
            className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Anterior"
          >
            ‹
          </button>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPosition(i + 1); resetTimer(); }}
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
