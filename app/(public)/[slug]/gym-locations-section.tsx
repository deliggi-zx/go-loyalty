import { GymLocationCard } from "./gym-location-card";
import type { GymLocation } from "./gym-data";

interface GymLocationsSectionProps {
  locations: GymLocation[];
}

export function GymLocationsSection({ locations }: GymLocationsSectionProps) {
  if (locations.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-stone-900">Nuestras Sedes</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <GymLocationCard key={loc.id} loc={loc} />
        ))}
      </div>
    </section>
  );
}
