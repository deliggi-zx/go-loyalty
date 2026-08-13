import { Star } from "lucide-react";
import type { VetReviewEntry } from "./vet-reviews-data";

interface VetReviewsDisplayProps {
  reviews: VetReviewEntry[];
}

// Cuántas tarjetas como mínimo queremos ver antes de que el loop "vuelva
// a empezar" — con pocos comentarios reales, se repite el set las veces
// que hagan falta para llegar a este piso, así el carrusel nunca se
// siente cortado/vacío. El track se arma duplicando ESE set ya
// "rellenado" una vez más (ver trackReviews) — mismo mecanismo que
// .promo-bar-track: con translateX(-50%) el salto es invisible sin
// importar cuántas copias haya, siempre que las dos mitades sean
// idénticas.
const MIN_CARDS_FOR_DENSITY = 8;

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[1px]" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-2.5 h-2.5"
          fill={i <= rating ? "#f59e0b" : "none"}
          stroke={i <= rating ? "#f59e0b" : "rgba(255,255,255,0.45)"}
        />
      ))}
    </div>
  );
}

// Corrección al pedido anterior (rev. 3): "escribir" un comentario vive
// en /perfil (VetReviewsSection, sin cambios ahí — botón "Dejar
// comentario", modal, borrado). Este componente es SOLO la vidriera:
// vive en el Home, debajo del rastro de huellas (posición original,
// antes de la rev. 3), en loop automático, sin ninguna interacción —
// ni botón de comentar ni de borrar acá, a propósito (evita repetir el
// mismo ajuste fino de contención en 100svh que ya hizo falta la
// primera vez, y esas acciones ya tienen un lugar claro en /perfil).
export function VetReviewsDisplay({ reviews }: VetReviewsDisplayProps) {
  if (reviews.length === 0) {
    return (
      <p className="inline-block text-[11px] text-white/85 bg-black/30 backdrop-blur-[2px] px-3 py-1.5 rounded-full whitespace-nowrap">
        Sé el primero en comentar desde tu perfil
      </p>
    );
  }

  const repeatCount = Math.max(2, Math.ceil(MIN_CARDS_FOR_DENSITY / reviews.length));
  const paddedReviews = Array.from({ length: repeatCount }, () => reviews).flat();
  const trackReviews = [...paddedReviews, ...paddedReviews];

  return (
    <div className="overflow-hidden">
      <div className="vet-reviews-track">
        {trackReviews.map((r, idx) => (
          <div
            key={`${r.id}-${idx}`}
            className="shrink-0 w-[8.5rem] sm:w-40 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-2.5 py-1.5"
          >
            <StarRow rating={r.rating} />
            <p className="text-[10px] leading-snug text-white line-clamp-1 mt-0.5">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
