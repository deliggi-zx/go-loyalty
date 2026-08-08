import { GymClassesCarousel } from "./gym-classes-carousel";
import type { GymClassData } from "./gym-data";

interface GymClassesSectionProps {
  classes: GymClassData[];
}

export function GymClassesSection({ classes }: GymClassesSectionProps) {
  if (classes.length === 0) return null;

  return (
    <section id="clases" className="space-y-4">
      {/* text-white, no stone-900: esta sección solo se renderiza para orgs
          con hasGymFeatures, cuyo fondo real es casi negro (#080808, ver
          loyalty_organizations.background_color en Gym2) — stone-900 quedaba
          casi ilegible ahí. Encontrado y corregido en la Fase 0c-i. */}
      <h2 className="text-xl font-bold text-white">Nuestras Clases</h2>

      <GymClassesCarousel classes={classes} />
    </section>
  );
}
