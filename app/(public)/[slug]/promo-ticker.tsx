function PromoBar({
  position,
  phrases,
  accent,
}: {
  position: "top" | "bottom";
  phrases: string[];
  accent: "neon" | "bike";
}) {
  // Contenido duplicado una vez para que translateX(-50%) haga un loop sin
  // corte visible.
  const items = [...phrases, ...phrases];
  const accentClass = accent === "bike" ? "promo-bar-bike" : "";

  return (
    <div className={`promo-bar promo-bar-${position} ${accentClass}`} aria-hidden="true">
      <div className="promo-bar-track">
        {items.map((phrase, i) => (
          <span key={i} className="flex items-center gap-6">
            {phrase}
            <span className="promo-bar-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface PromoTickerProps {
  topPhrases: string[];
  bottomPhrases: string[];
  // "neon" (verde-limón, default) = Gym2, sin cambios. "bike" = naranja
  // (Fase 3e), pisa --neon con --accent-bike vía .promo-bar-bike en
  // globals.css — no hardcodea ningún color acá, solo elige la clase.
  accent?: "neon" | "bike";
}

// Dos barras horizontales con frases en loop — reemplazan al cartel diagonal
// (ver .promo-bar en globals.css). Una ancla al borde superior del video, la
// otra al inferior; ancho completo en cualquier tamaño de pantalla, sin el
// problema de recorte/posicionamiento que tenía la diagonal. Vive dentro del
// bloque del video del hero (absolute, no fixed), así que nunca puede tapar
// el botón de WhatsApp.
//
// Componente genérico: las frases las decide el caller (ver TICKER_PHRASES
// en layout.tsx) — no hardcodea copy de ninguna org en particular.
export function PromoTicker({ topPhrases, bottomPhrases, accent = "neon" }: PromoTickerProps) {
  return (
    <>
      <PromoBar position="top" phrases={topPhrases} accent={accent} />
      <PromoBar position="bottom" phrases={bottomPhrases} accent={accent} />
    </>
  );
}
