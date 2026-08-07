"use client";

import { MapPin, Clock } from "lucide-react";
import { LocationPlaceholder } from "./gym-placeholder";
import type { GymLocation } from "./gym-data";

// Miniatura de mapa decorativa — sin API key, sin librerías externas, no
// interactiva. Recoloreada en verde-limón para el estilo neón de Gym2 (antes
// era gris claro con un pin rojo).
function StaticMapMockup() {
  return (
    <div className="location-map-mock">
      <svg viewBox="0 0 200 90" className="w-full h-full" aria-hidden="true">
        <rect width="200" height="90" fill="#0a0a0b" />
        <path d="M0 32 H200" stroke="#1f2a08" strokeWidth="5" />
        <path d="M0 66 H200" stroke="#1f2a08" strokeWidth="3" />
        <path d="M52 0 V90" stroke="#1f2a08" strokeWidth="4" />
        <path d="M140 0 V90" stroke="#1f2a08" strokeWidth="3" />
      </svg>
      <MapPin
        className="location-map-pin w-[18px] h-[18px] text-[#ccff00] drop-shadow-[0_0_5px_#ccff00]"
        aria-hidden="true"
      />
    </div>
  );
}

// Tarjeta de sede con estilo neón (ver .location-card en globals.css): en
// reposo está "apagada" (fondo casi negro, sin glow, sin mapa); al
// hover/focus/tap se "enciende" — aparece el halo #ccff00 y recién ahí se
// revela el mapa mockup + el botón de Google Maps. En desktop el :hover de
// CSS se encarga solo. En mobile no hay :hover real, así que el encendido
// depende de `isActive` (estado de cuál sede está activa, manejado por el
// padre — GymLocationsSection — para poder apagarla con un tap afuera).
export function GymLocationCard({
  loc,
  isActive,
  onActivate,
}: {
  loc: GymLocation;
  isActive: boolean;
  onActivate: () => void;
}) {
  const mapsQuery = loc.address ?? loc.name;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div
      className={`location-card ${isActive ? "is-open" : ""}`}
      onClick={() => {
        if (!isActive) onActivate();
      }}
      role="group"
      aria-label={loc.name}
    >
      <div className="location-card-photo">
        {loc.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loc.photo_url} alt={loc.name} />
        ) : (
          <LocationPlaceholder name={loc.name} />
        )}
        <div className="location-card-photo-label">{loc.name}</div>
      </div>

      <div className="location-card-body">
        {loc.address && (
          <p className="location-card-row">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{loc.address}</span>
          </p>
        )}
        {loc.opening_hours && (
          <p className="location-card-row">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{loc.opening_hours}</span>
          </p>
        )}

        <div className="location-card-reveal">
          <StaticMapMockup />
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="location-maps-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Ver en Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
