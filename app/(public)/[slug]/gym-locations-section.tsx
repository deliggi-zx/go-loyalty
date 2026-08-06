import { MapPin, Clock } from "lucide-react";
import { LocationPlaceholder } from "./gym-placeholder";
import type { GymLocation } from "./gym-data";

// Miniatura de mapa decorativa — sin API key, sin librerías externas, no interactiva.
function StaticMapMockup() {
  return (
    <div className="relative w-full h-full bg-stone-200">
      <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
        <rect width="200" height="120" fill="#e7e5e4" />
        <path d="M0 42 H200" stroke="#d6d3d1" strokeWidth="6" />
        <path d="M0 88 H200" stroke="#d6d3d1" strokeWidth="4" />
        <path d="M58 0 V120" stroke="#d6d3d1" strokeWidth="5" />
        <path d="M148 0 V120" stroke="#d6d3d1" strokeWidth="4" />
        <path d="M0 15 H200" stroke="#e7e5e4" strokeWidth="2" />
      </svg>
      <MapPin
        className="w-7 h-7 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[85%] drop-shadow"
        fill="currentColor"
      />
    </div>
  );
}

function LocationCard({ loc, primaryColor }: { loc: GymLocation; primaryColor: string }) {
  const mapsQuery = loc.address ?? loc.name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col">
      <div className="h-40">
        {loc.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loc.photo_url} alt={loc.name} className="w-full h-full object-cover" />
        ) : (
          <LocationPlaceholder name={loc.name} />
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-stone-900">{loc.name}</h3>

        <div className="space-y-1.5 flex-1">
          {loc.address && (
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
              {loc.address}
            </p>
          )}
          {loc.opening_hours && (
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
              {loc.opening_hours}
            </p>
          )}
        </div>

        <div className="h-24 rounded-lg overflow-hidden border border-stone-100">
          <StaticMapMockup />
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <MapPin className="w-4 h-4" />
          Ver en Google Maps
        </a>
      </div>
    </div>
  );
}

interface GymLocationsSectionProps {
  locations: GymLocation[];
  primaryColor: string;
}

export function GymLocationsSection({ locations, primaryColor }: GymLocationsSectionProps) {
  if (locations.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-stone-900">Nuestras Sedes</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <LocationCard key={loc.id} loc={loc} primaryColor={primaryColor} />
        ))}
      </div>
    </section>
  );
}
