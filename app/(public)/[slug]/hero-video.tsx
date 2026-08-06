import { NeonTabs } from "./neon-tabs";
import { PromoTicker } from "./promo-ticker";

// Sección de video, debajo del banner. Ancho completo, formato 4:3, autoplay
// muteado y en loop. Si la org no tiene hero_video_url cargado (ej. Gym1),
// no renderiza nada.
//
// `showNeonOverlay` agrega las pestañas neón + el cartel diagonal (Gym2-only,
// condicionado por el caller a que la org tenga datos gym_* cargados). Van
// absolute dentro de este bloque, nunca fixed a toda la pantalla, para que
// no puedan chocar con el botón de WhatsApp.
interface HeroVideoProps {
  videoUrl: string | null;
  showNeonOverlay?: boolean;
}

export function HeroVideo({ videoUrl, showNeonOverlay = false }: HeroVideoProps) {
  if (!videoUrl) return null;

  return (
    <div className="w-full aspect-[4/3] overflow-hidden relative bg-stone-900">
      <video autoPlay muted loop playsInline className="w-full h-full object-cover">
        <source src={videoUrl} />
      </video>

      {showNeonOverlay && (
        <>
          <NeonTabs />
          <PromoTicker />
        </>
      )}
    </div>
  );
}
