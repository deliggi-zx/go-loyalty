import { Dumbbell } from "lucide-react";

interface GymFeaturedBannerProps {
  // Foto de la primera sede de gym_locations (ya se pide en perfil/page.tsx
  // para GymProfileHeader, así que no hace falta ningún fetch nuevo). Puede
  // ser null si la org todavía no cargó fotos — ahí cae al degradé de
  // respaldo, mismo criterio que LocationPlaceholder en gym-placeholder.tsx.
  photoUrl: string | null;
}

// Fase 7 del showroom de Gym2: banner chico arriba de todo en Mi Perfil,
// puramente decorativo (sin onClick, no lleva a ningún lado todavía). Texto
// fijo de ejemplo, no viene de ninguna tabla.
export function GymFeaturedBanner({ photoUrl }: GymFeaturedBannerProps) {
  return (
    <div className="relative h-32 rounded-2xl overflow-hidden border border-[#ccff00]/40 shadow-[0_0_14px_rgba(204,255,0,0.25)]">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1f2a08] to-[#0a0a0b] flex items-center justify-center">
          <Dumbbell className="w-10 h-10 text-[#ccff00]/40" />
        </div>
      )}

      {/* Degradé oscuro para que el texto sea legible sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ccff00]">
          Borne Fitness Lab
        </p>
        <h2 className="text-lg font-bold text-white drop-shadow-[0_0_10px_rgba(204,255,0,0.4)]">
          Entrenamientos de Borne
        </h2>
      </div>
    </div>
  );
}
