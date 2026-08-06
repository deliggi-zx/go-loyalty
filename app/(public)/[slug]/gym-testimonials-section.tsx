import { Star } from "lucide-react";
import { TestimonialForm } from "./testimonial-form";
import type { GymTestimonial } from "./gym-data";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i <= rating ? "#f59e0b" : "none"}
          stroke={i <= rating ? "#f59e0b" : "#d6d3d1"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: GymTestimonial }) {
  return (
    <div className="shrink-0 w-64 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-2">
      <StarRow rating={t.rating} />
      <p className="text-sm text-white leading-snug line-clamp-4">{t.body}</p>
      <p className="text-xs text-white/70 font-medium">{t.author_name}</p>
    </div>
  );
}

interface GymTestimonialsSectionProps {
  testimonials: GymTestimonial[];
  orgId: string;
  slug: string;
  primaryColor: string;
  isLoggedIn: boolean;
  backgroundUrl: string | null;
  orgName: string;
}

export function GymTestimonialsSection({
  testimonials,
  orgId,
  slug,
  primaryColor,
  isLoggedIn,
  backgroundUrl,
  orgName,
}: GymTestimonialsSectionProps) {
  return (
    <section className="relative rounded-2xl overflow-hidden">
      {/* Fondo: banner del negocio con overlay oscuro para legibilidad de las tarjetas glass */}
      <div className="absolute inset-0">
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundUrl} alt={orgName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: primaryColor }} />
        )}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="relative p-5 sm:p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Lo que dicen nuestros socios</h2>

        {testimonials.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/80">
            Todavía no hay reseñas. ¡Sé el primero en dejar la tuya!
          </p>
        )}

        <div className="max-w-md">
          {isLoggedIn ? (
            <TestimonialForm orgId={orgId} slug={slug} primaryColor={primaryColor} />
          ) : (
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4">
              <p className="text-sm text-white/90">
                Iniciá sesión para dejar tu propia reseña.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
