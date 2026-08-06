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

      {/* Mobile: carrusel horizontal deslizable (con 8 sedes, apiladas
          verticalmente ocupaba demasiado espacio). Desktop (≥640px): vuelve
          a la grilla de siempre. El -mx-4/px-4 hace que el carrusel sangre
          hasta el borde de la pantalla en mobile (se cancela en sm: porque
          ahí ya no es un scroller). El py-10/-my-10 evita que el overflow
          del scroller recorte el glow de las tarjetas al encenderse — mismo
          criterio que ya usamos en el carrusel de clases. */}
      <div
        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 -mx-4 px-4 py-10 -my-10
          sm:mx-0 sm:px-0 sm:py-0 sm:my-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible"
      >
        {locations.map((loc) => (
          <div key={loc.id} className="shrink-0 w-[80%] snap-start sm:w-auto sm:shrink">
            <GymLocationCard loc={loc} />
          </div>
        ))}
      </div>
    </section>
  );
}
