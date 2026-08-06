"use client";

import { useState, useTransition } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { submitTestimonial } from "./gym-actions";
import { TESTIMONIAL_MAX_LENGTH } from "@/lib/loyalty/testimonial-filter";

interface TestimonialFormProps {
  orgId: string;
  slug: string;
  primaryColor: string;
}

export function TestimonialForm({ orgId, slug, primaryColor }: TestimonialFormProps) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Elegí un puntaje de 1 a 5 estrellas.");
      return;
    }

    startTransition(async () => {
      const result = await submitTestimonial(orgId, slug, body, rating);
      if (!result.ok) {
        setError(result.error ?? "No pudimos publicar tu reseña.");
        return;
      }
      setSuccess(true);
      setBody("");
      setRating(0);
    });
  }

  if (success) {
    return (
      <div className="bg-white/95 backdrop-blur rounded-2xl p-5 flex flex-col items-center text-center gap-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        <p className="font-semibold text-stone-900">¡Gracias por tu reseña!</p>
        <p className="text-sm text-stone-500">Ya se publicó para que otros socios la vean.</p>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm font-medium mt-1"
          style={{ color: primaryColor }}
        >
          Dejar otra reseña
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur rounded-2xl p-5 space-y-3"
    >
      <p className="font-semibold text-stone-900 text-sm">Dejá tu reseña</p>

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

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={TESTIMONIAL_MAX_LENGTH}
          rows={3}
          placeholder="Contanos tu experiencia en el gimnasio..."
          className="w-full text-sm rounded-lg border border-stone-200 p-3 focus:outline-none focus:border-stone-400 transition-colors resize-none"
        />
        <p className="text-right text-[11px] text-stone-400 mt-0.5">
          {body.length}/{TESTIMONIAL_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !body.trim()}
        className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: primaryColor }}
      >
        <Send className="w-4 h-4" />
        {isPending ? "Publicando..." : "Publicar reseña"}
      </button>
    </form>
  );
}
