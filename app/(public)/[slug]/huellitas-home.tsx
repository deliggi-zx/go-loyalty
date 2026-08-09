"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

// Forma de huella real (SVG), no un ícono genérico de librería — un pad
// principal + 4 dedos en arco, reutilizada tanto para los botones de
// navegación como para las huellas decorativas del fondo (ver PawMark).
function PawShape({ color }: { color: string }) {
  return (
    <>
      <ellipse cx="32" cy="43" rx="16" ry="13" fill={color} />
      <ellipse cx="13" cy="21" rx="7.5" ry="9.5" fill={color} transform="rotate(-24 13 21)" />
      <ellipse cx="25" cy="9" rx="7" ry="9" fill={color} transform="rotate(-8 25 9)" />
      <ellipse cx="39" cy="9" rx="7" ry="9" fill={color} transform="rotate(8 39 9)" />
      <ellipse cx="51" cy="21" rx="7.5" ry="9.5" fill={color} transform="rotate(24 51 21)" />
    </>
  );
}

function PawMark({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <PawShape color={color} />
    </svg>
  );
}

interface PawButtonProps {
  href: string;
  label: string;
  color: string;
}

function PawButton({ href, label, color }: PawButtonProps) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 64 64"
        className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
        aria-hidden="true"
      >
        <PawShape color={color} />
      </svg>
      <span className="text-xs sm:text-sm font-medium text-stone-700 tracking-wide text-center">
        {label}
      </span>
    </Link>
  );
}

const NAV_BUTTONS: { label: string; hrefSuffix: string; color: string }[] = [
  { label: "Nosotros", hrefSuffix: "/nosotros", color: "#d8c3a5" },
  { label: "Pet Shop", hrefSuffix: "/precios", color: "#c9a3a3" },
  { label: "Peluquería", hrefSuffix: "/peluqueria", color: "#a7c0cc" },
  { label: "Refugio", hrefSuffix: "/refugio", color: "#a8b799" },
  { label: "Perdidos", hrefSuffix: "/perdidos", color: "#b6a3ab" },
  { label: "Consejos", hrefSuffix: "/consejos", color: "#a3a79c" },
];

interface HuellitasHomeProps {
  slug: string;
  orgName: string;
  // 7 URLs, índice = Date.getDay() (0 domingo .. 6 sábado). Puede traer
  // huecos si algún upload falló — se resuelve con un fallback simple.
  videos: (string | null)[];
}

export function HuellitasHome({ slug, orgName, videos }: HuellitasHomeProps) {
  // Día de la semana: se resuelve en el cliente después del montaje para no
  // arriesgar un mismatch de hidratación entre el día del server y el del
  // navegador del usuario (distintas zonas horarias). El primer render
  // (server + cliente antes del efecto) usa el índice 0 en ambos lados —
  // coinciden siempre, así que no hay warning — y el efecto lo corrige al
  // día real apenas monta, con un swap casi instantáneo.
  const [dayIndex, setDayIndex] = useState(0);
  useEffect(() => {
    setDayIndex(new Date().getDay());
  }, []);

  const fallbackVideo = videos.find((v): v is string => Boolean(v)) ?? null;
  const activeVideo = videos[dayIndex] ?? fallbackVideo;

  return (
    <div className="bg-[#faf6ef]">
      {/* Hero: video a pantalla completa en loop, sin audio, con el nombre
          de la marca centrado arriba y un velo sutil para legibilidad. */}
      <section className="relative w-full h-[100svh] overflow-hidden">
        {activeVideo && (
          <video
            key={activeVideo}
            className="absolute inset-0 w-full h-full object-cover"
            src={activeVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/50" />

        <div className="absolute inset-x-0 top-12 sm:top-16 flex justify-center px-4">
          <h1
            className={`${playfair.className} text-4xl sm:text-6xl text-white tracking-wide text-center`}
            style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
          >
            {orgName}
          </h1>
        </div>
      </section>

      {/* Navegación: 2 filas x 3 botones huella sobre fondo marfil/hueso,
          con filete fino cerca de los bordes y unas pocas huellas
          decorativas de fondo, todo en opacidad baja y sutil. */}
      <section className="relative px-4 sm:px-8 py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-3 sm:inset-5 border border-[#c9ae8c]/30 rounded-sm" />

        <PawMark
          className="pointer-events-none absolute bottom-8 right-8 w-9 h-9 rotate-12"
          color="#c9ae8c1a"
        />
        <PawMark
          className="pointer-events-none absolute bottom-20 right-20 w-6 h-6 -rotate-6"
          color="#c9ae8c1a"
        />
        <PawMark
          className="pointer-events-none absolute bottom-10 right-32 w-7 h-7 rotate-45"
          color="#c9ae8c14"
        />
        <PawMark
          className="pointer-events-none absolute top-8 left-8 w-8 h-8 -rotate-12"
          color="#c9ae8c14"
        />

        <div className="relative max-w-md sm:max-w-xl mx-auto grid grid-cols-3 gap-x-6 gap-y-10 sm:gap-x-10 sm:gap-y-14">
          {NAV_BUTTONS.map((btn) => (
            <PawButton
              key={btn.label}
              href={`/${slug}${btn.hrefSuffix}`}
              label={btn.label}
              color={btn.color}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
