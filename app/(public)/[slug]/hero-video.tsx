import { NeonTabs } from "./neon-tabs";
import { PromoTicker } from "./promo-ticker";
import { VerticalGlassTabs } from "./vertical-glass-tabs";
import type { SectionNavTabItem } from "./section-nav-tabs";

// Sección de video, debajo del banner. Ancho completo, formato 4:3, autoplay
// muteado y en loop. Si la org no tiene hero_video_url cargado (ej. Gym1),
// no renderiza nada.
//
// `showNeonTabs` agrega las pestañas neón verticales (Sedes/Clases/Planes) —
// específicas del showroom de gimnasio, el caller solo las prende si la org
// tiene datos gym_* cargados.
//
// `verticalTabs` agrega pestañas de vidrio genéricas a los costados del
// video (ver VerticalGlassTabs) — independiente de showNeonTabs, con su
// propio acento de color. Hoy solo "bike" (Fase 3d), reemplazando ahí a
// SectionNavTabs (que sigue existiendo para otras orgs).
//
// `tickerPhrases` agrega las franjas ("ticker bars") con texto en loop
// arriba y abajo del video — genérico, cualquier org puede usarlas pasando
// su propio copy (ver TICKER_PHRASES en layout.tsx). null/undefined = sin
// franjas.
//
// Los tres overlays van absolute dentro de este bloque (que tiene
// overflow-hidden), nunca fixed a toda la pantalla, para que no puedan
// chocar con el botón de WhatsApp.
interface HeroVideoProps {
  videoUrl: string | null;
  showNeonTabs?: boolean;
  verticalTabs?: { left: SectionNavTabItem[]; right: SectionNavTabItem[] } | null;
  tickerPhrases?: { top: string[]; bottom: string[] } | null;
}

export function HeroVideo({
  videoUrl,
  showNeonTabs = false,
  verticalTabs = null,
  tickerPhrases = null,
}: HeroVideoProps) {
  if (!videoUrl) return null;

  return (
    <div className="w-full aspect-[4/3] overflow-hidden relative bg-stone-900">
      <video autoPlay muted loop playsInline className="w-full h-full object-cover">
        <source src={videoUrl} />
      </video>

      {showNeonTabs && <NeonTabs />}
      {verticalTabs && (
        <VerticalGlassTabs leftItems={verticalTabs.left} rightItems={verticalTabs.right} />
      )}
      {tickerPhrases && (
        <PromoTicker topPhrases={tickerPhrases.top} bottomPhrases={tickerPhrases.bottom} />
      )}
    </div>
  );
}
