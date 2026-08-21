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
const AUTOPLAY_INTERVAL_MS = 3500;

export function ProductRail({
  slug,
  title,
  products,
  primaryColor,
  catalogHref,
  autoplay,
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
    const maxScroll = el.scrollWidth - el.clientWidth;
    // Ya está mostrando el final del estante (última card visible) → vuelve
    // al primer producto. Si todavía no llegó, avanza un paso pero
    // clampeado a maxScroll — con pocas cards el próximo paso "teórico"
    // suele pasarse del final antes de que el usuario haya visto las
    // últimas 1-2, así que sin este clamp el loop saltaba directo al
    // principio salteándoselas.
    const atEnd = el.scrollLeft >= maxScroll - 4;
    const nextLeft = atEnd ? 0 : Math.min(el.scrollLeft + step, maxScroll);
    el.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoplay && products.length > 1) {
      timerRef.current = setInterval(advance, AUTOPLAY_INTERVAL_MS);
    }
  }, [autoplay, products.length, advance]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // Igual que carousel.tsx: se pausa apenas el usuario toca (evita pelear
  // el scroll con el avance automático a mitad de un swipe) y retoma
  // recién después de AUTOPLAY_INTERVAL_MS de inactividad tras soltar.
  function handleTouchStart() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleTouchEnd() {
    resetTimer();
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-900 px-1">{title}</h2>
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory"
      >
        {products.map((product) => {
          const showCompareAt =
            product.compareAtPrice !== null && product.compareAtPrice > product.price;

          return (
            <Link
              key={product.id}
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
