"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface GymAboutSectionProps {
  aboutText: string | null;
  bannerUrl: string | null;
  orgName: string;
  // Texto visible del encabezado — default "Quiénes Somos" (Gym2, sin
  // cambios). "bike" pasa "Nosotros" (Fase 3i, Gate 3). El id/target de
  // ancla sigue siendo "quienes-somos" para las dos, no hace falta que
  // coincida con el label visible.
  title?: string;
  // Fase 6 "Mundo Bike": mini galería propia de 3 fotos en vez de
  // reusar el banner principal de la org (bannerUrl) en esta franja —
  // hoy solo "bike" la pasa (ver page.tsx). Cuando está presente, gana
  // sobre bannerUrl acá adentro; Gym2 (la otra única org con about_text
  // hoy) no la pasa, así que sigue exactamente igual que antes.
  galleryUrls?: string[];
}

// Destino de la pestaña "Quiénes Somos"/"Nosotros" según la org. Mismo
// patrón visual que GymLocationsSection/GymClassesSection (franja con el
// banner + título). Si la org no tiene about_text cargado, no renderiza
// nada.
//
// Fase 3i (Gate 2): arranca colapsado — se ve el banner + indicador "Leer
// más", el texto solo aparece al hacer click. Es un cambio genérico (este
// componente es compartido) — afecta tanto a "bike" como a Gym2, las dos
// únicas orgs que hoy cargan about_text.
export function GymAboutSection({
  aboutText,
  bannerUrl,
  orgName,
  title = "Quiénes Somos",
  galleryUrls,
}: GymAboutSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!aboutText) return null;

  return (
    <section id="quienes-somos" className="space-y-3 scroll-mt-16">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="block w-full text-left"
      >
        {galleryUrls && galleryUrls.length > 0 ? (
          <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden grid grid-cols-3 gap-0.5">
            {galleryUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={`${orgName} ${i + 1}`} className="w-full h-full object-cover" />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <h2 className="absolute bottom-3 left-4 text-xl font-bold text-white drop-shadow">
              {title}
            </h2>
            <span className="absolute bottom-3 right-4 flex items-center gap-1 text-xs font-medium text-white/90 drop-shadow">
              {expanded ? "Leer menos" : "Leer más"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </span>
          </div>
        ) : bannerUrl ? (
          <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt={orgName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <h2 className="absolute bottom-3 left-4 text-xl font-bold text-white drop-shadow">
              {title}
            </h2>
            <span className="absolute bottom-3 right-4 flex items-center gap-1 text-xs font-medium text-white/90 drop-shadow">
              {expanded ? "Leer menos" : "Leer más"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">{title}</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
              {expanded ? "Leer menos" : "Leer más"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </span>
          </div>
        )}
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-stone-600 whitespace-pre-wrap">{aboutText}</p>
        </div>
      </div>
    </section>
  );
}
