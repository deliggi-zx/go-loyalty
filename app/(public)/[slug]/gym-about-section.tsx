interface GymAboutSectionProps {
  aboutText: string | null;
  bannerUrl: string | null;
  orgName: string;
}

// Destino de la pestaña neón "Quiénes Somos". Mismo patrón visual que
// GymLocationsSection/GymClassesSection (franja con el banner + título).
// Si la org no tiene about_text cargado, no renderiza nada.
export function GymAboutSection({ aboutText, bannerUrl, orgName }: GymAboutSectionProps) {
  if (!aboutText) return null;

  return (
    <section id="quienes-somos" className="space-y-4">
      {bannerUrl && (
        <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerUrl} alt={orgName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <h2 className="absolute bottom-3 left-4 text-xl font-bold text-white drop-shadow">
            Quiénes Somos
          </h2>
        </div>
      )}
      {!bannerUrl && <h2 className="text-xl font-bold text-stone-900">Quiénes Somos</h2>}

      <p className="text-stone-600 whitespace-pre-wrap">{aboutText}</p>
    </section>
  );
}
