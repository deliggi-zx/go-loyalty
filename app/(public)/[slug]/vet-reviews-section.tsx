"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Star, Trash2, X } from "lucide-react";
import { createVetReview, deleteVetReview } from "./vet-reviews-actions";
import type { VetReviewEntry } from "./vet-reviews-data";

interface VetReviewsSectionProps {
  slug: string;
  orgId: string;
  primaryColor: string;
  reviews: VetReviewEntry[];
}

// Cuántas tarjetas como mínimo queremos ver antes de que el loop "vuelva
// a empezar" — con pocos comentarios reales, se repite el set las veces
// que hagan falta para llegar a este piso, así el carrusel nunca se
// siente cortado/vacío (pedido explícito). El track se arma duplicando
// ESE set ya "rellenado" una vez más (ver trackReviews) — mismo
// mecanismo que .promo-bar-track: con translateX(-50%) el salto es
// invisible sin importar cuántas copias haya, siempre que las dos
// mitades sean idénticas.
const MIN_CARDS_FOR_DENSITY = 6;

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i <= rating ? "#f59e0b" : "none"}
          stroke={i <= rating ? "#f59e0b" : "rgba(255,255,255,0.5)"}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onDelete,
  deleting,
}: {
  review: VetReviewEntry;
  onDelete: (review: VetReviewEntry) => void;
  deleting: boolean;
}) {
  return (
    <div className="shrink-0 w-64 sm:w-72 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-2 relative">
      <StarRow rating={review.rating} />
      <p className="text-sm text-white leading-snug line-clamp-4">{review.comment}</p>
      {review.canDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(review)}
          aria-label="Borrar comentario"
          className="absolute top-2 right-2 p-1 text-white/70 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Fase 5 Huellitas, punto 4 (rev. 3 — reemplaza la versión anterior que
// vivía en el video del Home): bloque más dentro de /huellitas/perfil,
// mismo lugar que VetMyPets — ya no compite con el 100svh del video, así
// que las tarjetas van al doble de tamaño (w-64/72 vs los w-36/40 de la
// versión anterior) y no hace falta la verificación de contención
// estricta que sí hacía falta en el Home.
//
// Fondo con degradé del color de marca detrás del carrusel: sin esto,
// el efecto "vidrio esmerilado" (bg-white/15 + backdrop-blur) casi no se
// nota sobre el fondo claro liso de /perfil — necesita algo con color/
// contraste detrás para leerse como vidrio (mismo problema que resolvía
// el video en el Home, o el banner/overlay oscuro en
// gym-testimonials-section.tsx).
export function VetReviewsSection({ slug, orgId, primaryColor, reviews }: VetReviewsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openForm() {
    setRating(0);
    setComment("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (submitting) return;
    if (rating === 0) {
      setFormError("Elegí una calificación de 1 a 5 estrellas.");
      return;
    }
    if (!comment.trim()) {
      setFormError("Escribí un comentario.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createVetReview(slug, orgId, { rating, comment: comment.trim() });
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Algo salió mal, probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(review: VetReviewEntry) {
    if (!confirm("¿Borrar este comentario?")) return;
    startTransition(async () => {
      try {
        await deleteVetReview(slug, orgId, review.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo borrar.");
      }
    });
  }

  const repeatCount = reviews.length > 0 ? Math.max(2, Math.ceil(MIN_CARDS_FOR_DENSITY / reviews.length)) : 0;
  const paddedReviews = Array.from({ length: repeatCount }, () => reviews).flat();
  const trackReviews = [...paddedReviews, ...paddedReviews];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Comentarios</h2>
        <button
          type="button"
          onClick={openForm}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Dejar comentario
        </button>
      </div>

      {reviews.length > 0 ? (
        <div
          className="rounded-2xl overflow-hidden py-4"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)` }}
        >
          <div className="overflow-hidden px-4">
            <div className="vet-reviews-track">
              {trackReviews.map((r, idx) => (
                <ReviewCard key={`${r.id}-${idx}`} review={r} onDelete={handleDelete} deleting={isPending} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-stone-200 rounded-xl py-8 px-4 text-center text-sm text-stone-400">
          Todavía no hay comentarios. ¡Sé el primero en dejar el tuyo!
        </div>
      )}

      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setFormOpen(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div className="relative w-full max-w-sm rounded-2xl shadow-xl p-6 bg-white space-y-3">
              <button
                onClick={() => setFormOpen(false)}
                aria-label="Cerrar"
                className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <p className="text-sm font-semibold text-stone-900">Dejá tu comentario</p>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} estrellas`}
                    className="p-0.5"
                  >
                    <Star
                      className="w-6 h-6 transition-colors"
                      fill={star <= (hoverRating || rating) ? "#f59e0b" : "none"}
                      stroke={star <= (hoverRating || rating) ? "#f59e0b" : "#d6d3d1"}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Contanos tu experiencia..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-none"
              />

              {formError && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  {formError}
                </div>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: primaryColor || "#b98a72" }}
              >
                {submitting ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
