import { NeonTabs } from "./neon-tabs";
import { PromoTicker } from "./promo-ticker";

// Sección de video, debajo del banner. Ancho completo, formato 4:3, autoplay
// muteado y en loop. Si la org no tiene hero_video_url cargado (ej. Gym1),
// no renderiza nada.
//
// `showNeonTabs` agrega las pestañas neón verticales (Sedes/Clases/Planes) —
// específicas del showroom de gimnasio, el caller solo las prende si la org
// tiene datos gym_* cargados.
//
// `tickerPhrases` agrega las franjas ("ticker bars") con texto en loop
// arriba y abajo del video — genérico, cualquier org puede usarlas pasando
// su propio copy (ver TICKER_PHRASES en layout.tsx). null/undefined = sin
// franjas.
//
// Ambos overlays van absolute dentro de este bloque, nunca fixed a toda la
// pantalla, para que no puedan chocar con el botón de WhatsApp.
interface HeroVideoProps {
  videoUrl: string | null;
  showNeonTabs?: boolean;
  tickerPhrases?: { top: string[]; bottom: string[] } | null;
}

export function HeroVideo({ videoUrl, showNeonTabs = false, tickerPhrases = null }: HeroVideoProps) {
  if (!videoUrl) return null;

  return (
    <div className="w-full aspect-[4/3] overflow-hidden relative bg-stone-900">
      <video autoPlay muted loop playsInline className="w-full h-full object-cover">
        <source src={videoUrl} />
      </video>

      {showNeonTabs && <NeonTabs />}
      {tickerPhrases && (
        <PromoTicker topPhrases={tickerPhrases.top} bottomPhrases={tickerPhrases.bottom} />
      )}
    </div>
  );
}
