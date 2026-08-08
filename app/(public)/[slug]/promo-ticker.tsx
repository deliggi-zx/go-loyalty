function PromoBar({ position, phrases }: { position: "top" | "bottom"; phrases: string[] }) {
  // Contenido duplicado una vez para que translateX(-50%) haga un loop sin
  // corte visible.
  const items = [...phrases, ...phrases];

  return (
    <div className={`promo-bar promo-bar-${position}`} aria-hidden="true">
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
export function PromoTicker({ topPhrases, bottomPhrases }: PromoTickerProps) {
  return (
    <>
      <PromoBar position="top" phrases={topPhrases} />
      <PromoBar position="bottom" phrases={bottomPhrases} />
    </>
  );
}
