"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { CarouselProductItem } from "./data";
import { hasProductDetail } from "./product-detail-utils";
import { formatPrice } from "@/lib/utils";

interface ProductRailProps {
  slug: string;
  title: string;
  products: CarouselProductItem[];
  primaryColor: string;
  // Mismo fallback que FeaturedProductsGrid: productos sin ficha propia
  // (sin specs cargadas) linkean al catálogo general en vez de a
  // /[slug]/producto/[id].
  catalogHref: string;
  // Fase autoplay: default false (ver catalog_carousels.autoplay) — Die
  // lo prende carrusel por carrusel desde /dashboard/catalogo/carruseles.
  autoplay: boolean;
  // Fase Ecualizador de carruseles: los tres, por carrusel individual
  // (no global de la org) — ver catalog_carousels.{loop_infinite,
  // autoplay_speed_ms,direction} y el admin en dashboard/catalogo/
  // carruseles. Defaults acá replican el comportamiento de siempre por
  // si algún caller no los pasa.
  loopInfinite?: boolean;
  autoplaySpeedMs?: number;
  direction?: "forward" | "reverse";
}

// Fase Home: estante horizontal de productos para los carruseles
// configurables del admin (ver dashboard/catalogo/carruseles) — no
// reusa el mecanismo de deslizamiento con loop de carousel.tsx a
// propósito: ese componente es para imágenes promocionales con autoplay
// (loyalty_content), acá son cards de producto navegables por el usuario
// con scroll horizontal simple, mismo patrón que la fila de pills de
// categorías en product-catalog.tsx. Sí reusa el criterio de link
// (hasProductDetail) y la estructura visual de card de
// featured-products-grid.tsx/product-catalog.tsx en vez de inventar una
// nueva. Genérico — cualquier org con catalog_type='products' puede
// tener carruseles, no es exclusivo de SuperElectro.
//
// Fase autoplay: el timer/pausa/reanudación reusa el mismo criterio que
// carousel.tsx (setInterval que se rearma con resetTimer, se limpia al
// tocar y se rearma al soltar — así el próximo avance cae siempre X ms
// después de la última interacción, nunca a mitad de un swipe en curso).
// La mecánica de avance es distinta porque el contenedor acá es scroll
// nativo (overflow-x-auto + snap), no slides con translateX: en vez de
// mover un índice, se hace scrollTo por el ancho real de una card+gap
// (medido en el DOM, no hardcodeado, para no depender del gap-3 actual).
const DEFAULT_AUTOPLAY_SPEED_MS = 3500;

// Fase Ecualizador de carruseles: duración/framerate del paso animado
// cuando loop_infinite está prendido. Con setInterval en vez de
// requestAnimationFrame a propósito — comprobado real que rAF puede
// quedar completamente suspendido en una pestaña en segundo plano
// (rompía el loop, se congelaba sin avisar ni tirar error), mientras
// que setInterval sigue disparando igual sea cual sea el estado de la
// pestaña — mismo motivo por el que carousel.tsx evita transitionend.
// El resto de esta función (loop_infinite=false) sigue con el scrollTo
// nativo de siempre, sin tocar nada.
const LOOP_STEP_DURATION_MS = 500;
const LOOP_STEP_FRAME_MS = 20;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateScrollLeft(el: HTMLElement, target: number) {
  const start = el.scrollLeft;
  const change = target - start;
  if (change === 0) return;
  const totalFrames = Math.max(1, Math.round(LOOP_STEP_DURATION_MS / LOOP_STEP_FRAME_MS));
  let frame = 0;
  const id = setInterval(() => {
    frame += 1;
    const t = Math.min(frame / totalFrames, 1);
    el.scrollLeft = start + change * easeInOutQuad(t);
    if (t >= 1) clearInterval(id);
  }, LOOP_STEP_FRAME_MS);
}

export function ProductRail({
  slug,
  title,
  products,
  primaryColor,
  catalogHref,
  autoplay,
  loopInfinite = false,
  autoplaySpeedMs = DEFAULT_AUTOPLAY_SPEED_MS,
  direction = "forward",
}: ProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Paso = distancia real entre el inicio de la primera y la segunda
    // card (incluye el gap), medido en el DOM en vez de asumir un valor
    // fijo — si el gap o el ancho de card cambian, esto sigue andando.
    const first = el.children[0] as HTMLElement | undefined;
    const second = el.children[1] as HTMLElement | undefined;
    const step = first && second ? second.offsetLeft - first.offsetLeft : el.clientWidth;
    const signedStep = direction === "reverse" ? -step : step;

    if (loopInfinite) {
      // Track duplicado (ver `cards` más abajo): scrollWidth es el doble
      // de una vuelta real, así que la mitad es exactamente cuánto hay
      // que descontar/sumar para volver a la posición real equivalente
      // — invisible porque la segunda copia es pixel-idéntica a la
      // primera. Se corrige ACÁ, antes de armar el paso siguiente (nunca
      // en pleno vuelo): para este momento el paso animado anterior ya
      // terminó de sobra (autoplaySpeedMs nunca es tan corto como para
      // alcanzarlo).
      //
      // Solo se chequea el límite hacia el que este carrusel avanza —
      // nunca el opuesto: "forward" arranca en 0 (el límite bajo es su
      // punto de partida normal, no algo de lo que haya que "corregir");
      // "reverse" arranca en oneSetWidth por el mismo motivo (ver el
      // effect de más abajo). Comprobado real: chequear los dos límites
      // sin importar la dirección hacía que el primer tick interpretara
      // el propio arranque como un "ya di la vuelta" y saltara de más,
      // dejando el scroll rebotando entre dos posiciones nada más en vez
      // de recorrer todo el carrusel.
      //
      // Margen chico (no un `step` entero — un step entero de margen
      // también hacía disparar la corrección un paso antes de llegar de
      // verdad al límite, mismo síntoma de rebote): este margen solo
      // cubre que scroll-snap + el padding del contenedor (-mx-4 px-4)
      // hacen que el mínimo real alcanzable nunca sea exactamente 0 (el
      // navegador lo redondea al snap point más cercano, ~16px acá).
      const oneSetWidth = el.scrollWidth / 2;
      const edgeMargin = 20;
      if (direction === "reverse") {
        if (el.scrollLeft <= edgeMargin) el.scrollLeft += oneSetWidth;
      } else if (el.scrollLeft >= oneSetWidth - edgeMargin) {
        el.scrollLeft -= oneSetWidth;
      }

      animateScrollLeft(el, el.scrollLeft + signedStep);
      return;
    }

    // Comportamiento de siempre (loop_infinite=false, el default de
    // todo carrusel existente) — sin cambios de fondo, solo generalizado
    // a "reverse" (combinación nueva, direction siempre fue 'forward'
    // hasta esta fase): mismo salto duro de vuelta al extremo opuesto.
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (direction === "reverse") {
      const atStart = el.scrollLeft <= 4;
      const nextLeft = atStart ? maxScroll : Math.max(el.scrollLeft - step, 0);
      el.scrollTo({ left: nextLeft, behavior: "smooth" });
    } else {
      // Ya está mostrando el final del estante (última card visible) →
      // vuelve al primer producto. Si todavía no llegó, avanza un paso
      // pero clampeado a maxScroll — con pocas cards el próximo paso
      // "teórico" suele pasarse del final antes de que el usuario haya
      // visto las últimas 1-2, así que sin este clamp el loop saltaba
      // directo al principio salteándoselas.
      const atEnd = el.scrollLeft >= maxScroll - 4;
      const nextLeft = atEnd ? 0 : Math.min(el.scrollLeft + step, maxScroll);
      el.scrollTo({ left: nextLeft, behavior: "smooth" });
    }
  }, [loopInfinite, direction]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoplay && products.length > 1) {
      timerRef.current = setInterval(advance, autoplaySpeedMs);
    }
  }, [autoplay, products.length, advance, autoplaySpeedMs]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // Fase Ecualizador de carruseles: "reverse" arranca desde el extremo
  // opuesto a "forward" (que siempre arrancó en 0) — necesita margen
  // para retroceder. Con loop, el límite entre las dos copias del track
  // (mismo lugar al que se vuelve al corregir el salto); sin loop, el
  // final real del estante. Corre una sola vez al montar — direction/
  // loopInfinite vienen del carrusel guardado, no cambian en caliente.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || direction !== "reverse") return;
    el.scrollLeft = loopInfinite ? el.scrollWidth / 2 : el.scrollWidth - el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Igual que carousel.tsx: se pausa apenas el usuario toca (evita pelear
  // el scroll con el avance automático a mitad de un swipe) y retoma
  // recién después de autoplaySpeedMs de inactividad tras soltar.
  function handleTouchStart() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleTouchEnd() {
    resetTimer();
  }

  // Fase fix carruseles Home: onTouchStart/End solo cubre mobile — en
  // desktop el timer seguía corriendo sin importar el mouse, así que el
  // estante se corría solo debajo del cursor entre que el usuario
  // apuntaba una card y efectivamente hacía click, mandándolo a la ficha
  // de OTRA propiedad (o directo al catálogo si el click terminaba
  // cayendo afuera de cualquier card) — reproducido real en "En alquiler"
  // (Domus) y afecta por igual a cualquier carrusel con autoplay activo
  // de cualquier org (ProductRail es compartido, ver más arriba). Mismo
  // criterio pausa/retoma que el touch: se pausa mientras el mouse está
  // arriba del estante entero, se retoma recién al salir.
  function handleMouseEnter() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleMouseLeave() {
    resetTimer();
  }

  if (products.length === 0) return null;

  // Fase Ecualizador de carruseles: con loop_infinite, el track real es
  // [...products, ...products] — la segunda copia le da a advance() algo
  // hacia dónde seguir deslizando en la misma dirección sin nunca tocar
  // un extremo real (ver comentario en advance()). Nota: con muy pocos
  // productos en una pantalla ancha, la copia puede alcanzar a verse
  // entera al lado de la original — es una limitación conocida de la
  // técnica (le pasa a cualquier carrusel infinito con pocos ítems), no
  // un bug; Die decide por carrusel si tiene sentido prender el loop.
  const cards = loopInfinite ? [...products, ...products] : products;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-900 px-1">{title}</h2>
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory"
      >
        {cards.map((product, i) => {
          const showCompareAt =
            product.compareAtPrice !== null && product.compareAtPrice > product.price;

          return (
            <Link
              key={loopInfinite ? `${product.id}-${i}` : product.id}
              href={
                hasProductDetail(product.specs) ? `/${slug}/producto/${product.id}` : catalogHref
              }
              className="shrink-0 w-36 sm:w-44 snap-start rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageOff className="w-8 h-8 text-stone-300" />
                )}
              </div>
              <div className="p-3 space-y-1">
                {product.shippingBadgeText && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {product.shippingBadgeText}
                  </span>
                )}
                <p className="text-sm font-medium text-stone-900 line-clamp-2">{product.name}</p>
                {showCompareAt && (
                  <p className="text-xs text-stone-400 line-through">
                    {formatPrice(product.compareAtPrice!, product.currency)}
                  </p>
                )}
                <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                  {formatPrice(product.price, product.currency)}
                </p>
                {product.installmentsText && (
                  <p className="text-[11px] text-stone-500">{product.installmentsText}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
