// Sección de video, debajo del banner. Ancho completo, formato 4:3, autoplay
// muteado y en loop. Si la org no tiene hero_video_url cargado (ej. Gym1),
// no renderiza nada.
interface HeroVideoProps {
  videoUrl: string | null;
}

export function HeroVideo({ videoUrl }: HeroVideoProps) {
  if (!videoUrl) return null;

  return (
    <div className="w-full aspect-[4/3] overflow-hidden relative bg-stone-900">
      <video autoPlay muted loop playsInline className="w-full h-full object-cover">
        <source src={videoUrl} />
      </video>
    </div>
  );
}
