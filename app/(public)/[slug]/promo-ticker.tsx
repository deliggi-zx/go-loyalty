// Frases promocionales — las mismas que ya tenía el badge circular que este
// componente reemplaza.
const PHRASES = [
  "10% off en el plan anual",
  "Nueva sede en Sede Norte",
  "Clases ilimitadas en el plan Trimestral",
  "¡Sumate a Cross Funcional esta semana!",
];

// Cartel diagonal con las frases promocionales deslizándose en loop (ver
// .promo-ticker en globals.css). Reemplaza al badge circular giratorio:
// vive dentro del bloque del video del hero (absolute, no fixed), así que
// nunca puede tapar el botón de WhatsApp que está fijo a toda la pantalla.
// El contenido se duplica una vez para que translateX(-50%) haga un loop
// sin corte visible.
export function PromoTicker() {
  const items = [...PHRASES, ...PHRASES];

  return (
    <div className="promo-ticker" aria-hidden="true">
      <div className="promo-ticker-track">
        {items.map((phrase, i) => (
          <span key={i} className="flex items-center gap-6">
            {phrase}
            <span className="promo-ticker-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
