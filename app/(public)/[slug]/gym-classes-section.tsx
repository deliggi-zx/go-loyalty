import { GymClassesCarousel } from "./gym-classes-carousel";
import type { GymClassData } from "./gym-data";

interface GymClassesSectionProps {
  classes: GymClassData[];
}

export function GymClassesSection({ classes }: GymClassesSectionProps) {
  if (classes.length === 0) return null;

  return (
    <section id="clases" className="space-y-4">
      <h2 className="text-xl font-bold text-stone-900">Nuestras Clases</h2>

      <GymClassesCarousel classes={classes} />
    </section>
  );
}
