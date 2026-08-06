// Frases promocionales — las mismas que ya tenía el badge circular original.
// Se reparten 2 arriba / 2 abajo entre las dos barras para que no se vea
// literalmente el mismo texto duplicado arriba y abajo a la vez.
const TOP_PHRASES = ["10% off en el plan anual", "Nueva sede en Sede Norte"];
const BOTTOM_PHRASES = [
  "Clases ilimitadas en el plan Trimestral",
  "¡Sumate a Cross Funcional esta semana!",
];

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

// Dos barras horizontales con las frases promocionales en loop — reemplazan
// al cartel diagonal (ver .promo-bar en globals.css). Una ancla al borde
// superior del video, la otra al inferior; ancho completo en cualquier
// tamaño de pantalla, sin el problema de recorte/posicionamiento que tenía
// la diagonal. Vive dentro del bloque del video del hero (absolute, no
// fixed), así que nunca puede tapar el botón de WhatsApp. Gym2-only: se
// renderiza condicionado a `showNeonOverlay` desde HeroVideo.
export function PromoTicker() {
  return (
    <>
      <PromoBar position="top" phrases={TOP_PHRASES} />
      <PromoBar position="bottom" phrases={BOTTOM_PHRASES} />
    </>
  );
}
