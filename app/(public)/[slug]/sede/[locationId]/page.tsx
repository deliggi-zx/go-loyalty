import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock } from "lucide-react";
import { getTenantOrg } from "../../data";
import { getGymLocations, getGymLocationPhotos, getGymClasses } from "../../gym-data";
import { GymLocationGallery } from "../../gym-location-gallery";
import { GymClassesSection } from "../../gym-classes-section";

// Sub-home de una sede puntual (Fase 0c-i de "Gym2 funcional"): misma
// info que la home principal, pero acotada a esta sede — solo sus fotos
// (o el fallback de gym_locations si todavía no tiene galería propia, ver
// gym-location-gallery.tsx) y solo las clases con horarios en esta sede.
// No es un tenant separado: sigue siendo el mismo org_id, solo una vista
// filtrada — por eso reutiliza GymClassesSection tal cual en vez de
// duplicar su UI.
export default async function SedePage({
  params,
}: {
  params: { slug: string; locationId: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return notFound();

  const gymLocations = await getGymLocations(org.id);
  const location = gymLocations.find((l) => l.id === params.locationId);
  if (!location) return notFound();

  const [photos, gymClasses] = await Promise.all([
    getGymLocationPhotos(location.id),
    getGymClasses(org.id),
  ]);

  // Solo clases con al menos un horario en ESTA sede, y dentro de cada una
  // solo esos horarios (una clase puede tener horarios en varias sedes).
  const classesAtLocation = gymClasses
    .map((c) => ({
      ...c,
      schedule: c.schedule.filter((s) => s.location_id === location.id),
    }))
    .filter((c) => c.schedule.length > 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href={`/${params.slug}`}
        className="inline-block text-sm text-[#9b9995] hover:text-[#ccff00] transition-colors"
      >
        ‹ Volver
      </Link>

      <div className="space-y-4">
        <GymLocationGallery
          locationName={location.name}
          photoUrl={location.photo_url}
          photos={photos}
        />

        <div>
          {/* Fondo real de Gym2 es casi negro (#080808, ver
              loyalty_organizations.background_color) — texto claro acá a
              diferencia de GymClassesSection/GymLocationsSection más abajo,
              que se reutilizan tal cual y ya traían headings oscuros
              (text-stone-900) con bajo contraste sobre ese fondo; es un
              problema preexistente de esos componentes compartidos, no algo
              que haya que arreglar en esta página. */}
          <h1 className="text-2xl font-bold text-white">{location.name}</h1>
          <div className="mt-1 space-y-1">
            {location.address && (
              <p className="flex items-center gap-1.5 text-sm text-[#9b9995]">
                <MapPin className="w-4 h-4 shrink-0" />
                {location.address}
              </p>
            )}
            {location.opening_hours && (
              <p className="flex items-center gap-1.5 text-sm text-[#9b9995]">
                <Clock className="w-4 h-4 shrink-0" />
                {location.opening_hours}
              </p>
            )}
          </div>
        </div>
      </div>

      <GymClassesSection classes={classesAtLocation} />
    </div>
  );
}
