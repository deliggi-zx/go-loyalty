import { LocationPlaceholder } from "./gym-placeholder";
import type { GymLocationPhoto } from "./gym-data";

interface GymLocationGalleryProps {
  locationName: string;
  photoUrl: string | null;
  photos: GymLocationPhoto[];
}

// Fase 0c-i de "Gym2 funcional": si la sede tiene fotos propias en
// gym_location_photos (todavía ninguna, eso es de la Fase 0c-ii) se arma
// una grilla; si no, cae al único photo_url de gym_locations (caso de las
// 8 sedes hoy) — y si tampoco hay eso, al placeholder de siempre.
export function GymLocationGallery({ locationName, photoUrl, photos }: GymLocationGalleryProps) {
  if (photos.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className={`rounded-2xl overflow-hidden h-40 sm:h-56 ${
              i === 0 ? "col-span-2 h-56 sm:h-72" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photo_url}
              alt={locationName}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden h-56 sm:h-72">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={locationName} className="w-full h-full object-cover" />
      ) : (
        <LocationPlaceholder name={locationName} />
      )}
    </div>
  );
}
