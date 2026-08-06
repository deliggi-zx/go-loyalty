import { GymClassesCarousel } from "./gym-classes-carousel";
import type { GymClassData } from "./gym-data";

interface GymClassesSectionProps {
  classes: GymClassData[];
  primaryColor: string;
  bannerUrl: string | null;
  orgName: string;
}

export function GymClassesSection({
  classes,
  primaryColor,
  bannerUrl,
  orgName,
}: GymClassesSectionProps) {
  if (classes.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Franja con el banner del negocio, para mantener identidad visual */}
      {bannerUrl && (
        <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt={orgName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <h2 className="absolute bottom-3 left-4 text-xl font-bold text-white drop-shadow">
            Nuestras Clases
          </h2>
        </div>
      )}
      {!bannerUrl && <h2 className="text-xl font-bold text-stone-900">Nuestras Clases</h2>}

      <GymClassesCarousel classes={classes} primaryColor={primaryColor} />
    </section>
  );
}
