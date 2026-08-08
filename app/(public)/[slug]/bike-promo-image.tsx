"use client";

import { useState } from "react";

interface BikePromoImageProps {
  imageUrl: string;
  alt: string;
}

// Brillo naranja por debajo de la foto de promo al click/tap — efecto
// puramente visual, sin navegación (Fase 3i, Gate 5). Criterio elegido:
// se sostiene mientras el dedo/mouse está presionado (mousedown/touchstart
// → mouseup/touchend/mouseleave), como un estado de "press" normal, no un
// destello transitorio con timer. Solo "bike" — las demás orgs siguen
// mostrando la promo como <img> plano (ver page.tsx).
export function BikePromoImage({ imageUrl, alt }: BikePromoImageProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      className="rounded-2xl transition-shadow duration-200"
      style={{
        boxShadow: pressed
          ? "0 22px 44px -14px color-mix(in srgb, #ff6b00 80%, transparent)"
          : "0 0 0 transparent",
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className="w-full h-auto rounded-2xl object-contain" />
    </div>
  );
}
