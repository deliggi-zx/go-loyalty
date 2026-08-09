"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Logo con wordmark ("Huellitas" + "Veterinaria | Petshop"), fondo
// transparente — reemplaza el título en texto (antes en Playfair Display).
// Vive en el bucket "loyalty-content", carpeta branding/ (sin subcarpeta de
// org_id: así quedó subido el archivo real, a diferencia de hero-videos/
// que sí usa esa subcarpeta).
const LOGO_URL =
  "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/branding/logo.png";

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
    <Link href={href} className="group flex flex-col items-center gap-[0.6svh]">
      {/* Tamaño en svh (con piso/techo en px vía clamp), NO en breakpoints
          de ancho — el bug que arreglamos era de ALTO disponible, no de
          ancho: un viewport ancho pero bajo rompía igual que uno angosto.
          Con svh, la huella siempre es la misma proporción de la altura
          real del video, así que el grupo entero nunca se sale de
          h-[100svh] sin importar el aspect ratio de la pantalla. */}
      <svg
        viewBox="0 0 64 64"
        className="w-[clamp(2.75rem,9svh,6.25rem)] h-[clamp(2.75rem,9svh,6.25rem)] drop-shadow-md transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
        aria-hidden="true"
      >
        <PawShape color={color} />
      </svg>
      {/* Chip oscuro semi-transparente detrás del texto (en vez de solo
          sombra) — más contraste garantizado contra cualquier parte del
          video, clara u oscura. */}
      <span className="text-[clamp(9px,2svh,13px)] font-medium text-white tracking-wide text-center bg-black/35 backdrop-blur-[2px] px-1.5 py-0.5 rounded-full leading-tight whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}

// Colores con canal alfa (últimos 2 dígitos hex, "99" ≈ 60% opacidad) — más
// transparentes que el relleno sólido de antes. "Turnos" es el 7° botón
// nuevo; el resto son los mismos 6 de siempre, mismos tonos pastel base.
const NAV_BUTTONS: { label: string; hrefSuffix: string; color: string }[] = [
  { label: "Nosotros", hrefSuffix: "/nosotros", color: "#d8c3a599" },
  { label: "Pet Shop", hrefSuffix: "/precios", color: "#c9a3a399" },
  { label: "Peluquería", hrefSuffix: "/peluqueria", color: "#a7c0cc99" },
  { label: "Refugio", hrefSuffix: "/refugio", color: "#a8b79999" },
  { label: "Perdidos", hrefSuffix: "/perdidos", color: "#b6a3ab99" },
  { label: "Consejos", hrefSuffix: "/consejos", color: "#a3a79c99" },
  { label: "Turnos", hrefSuffix: "/turnos", color: "#8fac9b99" },
];

interface HuellitasHomeProps {
  slug: string;
  // Ya no se usa para el título (reemplazado por LOGO_URL, que trae su
  // propio wordmark) — se mantiene en la interfaz porque page.tsx la sigue
  // pasando y puede volver a hacer falta (ej. <title> de la pestaña).
  orgName: string;
  // 7 URLs, índice = Date.getDay() (0 domingo .. 6 sábado). Puede traer
  // huecos si algún upload falló — se resuelve con un fallback simple.
  videos: (string | null)[];
}

export function HuellitasHome({ slug, videos }: HuellitasHomeProps) {
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
      {/* Hero: video a pantalla completa en loop, sin audio. Logo Y los 7
          botones huella viven los dos ENTERAMENTE adentro de este
          contenedor relative + h-[100svh] + overflow-hidden (position
          absolute, mismo patrón que el header flotante de bike sobre su
          banner — ver isFloatingHeaderOrg en layout.tsx). TODAS las
          medidas verticales (logo, huellas, gaps, offsets) están en svh
          en vez de píxeles fijos + breakpoints de ancho: así el conjunto
          es siempre la misma proporción de la altura real del contenedor,
          sin importar si la pantalla es angosta y alta (mobile portrait) o
          ancha y baja (ventana chica de escritorio) — las dos formas en
          que esto se salía antes. Presupuesto en svh, de arriba a abajo:
          2 (offset) + 15 (logo) + ~52 (4 filas de botones) + 1 (offset) ≈
          70svh usados, con ~30svh de margen de sobra. */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/55" />

        {/* Filete fino cerca de los bordes de la pantalla + huellas
            decorativas, muy sutiles. */}
        <div className="pointer-events-none absolute inset-3 sm:inset-5 border border-white/25 rounded-sm" />
        <PawMark
          className="pointer-events-none absolute bottom-6 right-6 w-9 h-9 rotate-12"
          color="#ffffff1a"
        />
        <PawMark
          className="pointer-events-none absolute top-8 left-8 w-8 h-8 -rotate-12"
          color="#ffffff14"
        />

        <div className="absolute inset-x-0 top-[2svh] flex justify-center px-4">
          {/* w-fit: el wrapper toma el ancho real de la imagen (que se
              dimensiona por ALTO, ver la img de abajo), así el halo
              (absolute inset-0) calza justo con el logo sin importar su
              aspect ratio. */}
          <div className="relative w-fit">
            {/* Halo/blur detrás del logo para que no se pierda contra las
                partes claras del video. */}
            <div
              className="pointer-events-none absolute inset-0 scale-90 rounded-full bg-white/30 blur-2xl"
              aria-hidden="true"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_URL}
              alt="Huellitas Veterinaria"
              className="relative h-[clamp(4.5rem,15svh,11.5rem)] w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* Navegación: 7 botones huella, grid de 2 columnas (4 filas, la
            última con Turnos solo y centrado). Columna derecha con un leve
            translate-y hacia abajo respecto de la izquierda — evoca el
            paso alternado de una mascota caminando (un "rastro"), con un
            offset chico a propósito para no arriesgar que se salga del
            contenedor. Si en algún viewport se ve mal, sacar el translate
            y queda la grilla ordenada de siempre — fallback ya pedido. */}
        <div className="absolute inset-x-0 bottom-[1svh] px-4">
          <div className="max-w-[260px] sm:max-w-[360px] mx-auto grid grid-cols-2 gap-x-5 sm:gap-x-8 gap-y-[1.8svh]">
            {NAV_BUTTONS.map((btn, i) => {
              const isLast = i === NAV_BUTTONS.length - 1;
              const staggerDown = !isLast && i % 2 === 1;
              return (
                <div
                  key={btn.label}
                  className={
                    (isLast ? "col-span-2" : "") +
                    " flex justify-center" +
                    (staggerDown ? " translate-y-[1svh]" : "")
                  }
                >
                  <PawButton
                    href={`/${slug}${btn.hrefSuffix}`}
                    label={btn.label}
                    color={btn.color}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
