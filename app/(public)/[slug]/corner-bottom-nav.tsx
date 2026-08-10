"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarClock, CircleDot, Activity, User } from "lucide-react";
import { useCornerReserve } from "./corner-reserve-context";

// Bottom nav propio de Corner — componente aparte, NO pisa/toca SideMenu
// (el menú lateral ☰ que usan Cafetería/Bike/Gym2/Huellitas sigue
// intacto para esas orgs). Fase 2: todavía cosmético en algunos items —
// Actividad no tiene ruta propia todavía:
//   - Reservas y el ícono de cancha (central) abren el modal de Fase 4
//     (useCornerReserve) — mismo disparador que "Reservar" en la home.
//   - Actividad usa /[slug]/perfil, que YA muestra historial de puntos
//     real (genérico, no específico de Corner) — mejor eso que un
//     placeholder vacío.
// Inicio y Perfil sí son rutas reales.
export function CornerBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const isHome = pathname === `/${slug}`;
  const isProfile = pathname === `/${slug}/perfil`;
  const { openReserve } = useCornerReserve();

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
      active ? "text-[#1e8f4e]" : "text-[#6b6965] hover:text-white"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 h-16 bg-[#0a0a0b] border-t border-[#1c1c1e] flex items-stretch px-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link href={`/${slug}`} className={itemClass(isHome)}>
        <Home className="w-5 h-5" />
        Inicio
      </Link>

      <button type="button" onClick={openReserve} className={itemClass(false)}>
        <CalendarClock className="w-5 h-5" />
        Reservas
      </button>

      {/* Ícono central de cancha — más grande, destacado en verde, mismo
          destino que "Reservas" (acción primaria: reservar). */}
      <button
        type="button"
        onClick={openReserve}
        aria-label="Reservar cancha"
        className="flex flex-col items-center justify-center flex-1"
      >
        <span className="w-11 h-11 rounded-full bg-[#1e8f4e] flex items-center justify-center -mt-5 shadow-[0_0_14px_rgba(30,143,78,0.55)] border-4 border-[#0a0a0b]">
          <CircleDot className="w-5 h-5 text-white" />
        </span>
      </button>

      {/* Actividad no resalta activo a propósito: comparte destino con
          Perfil (ambos /perfil, ver comentario de arriba) y remarcar los
          dos a la vez confundiría más de lo que ayuda. Perfil sí, es su
          ruta "canónica". */}
      <Link href={`/${slug}/perfil`} className={itemClass(false)}>
        <Activity className="w-5 h-5" />
        Actividad
      </Link>

      <Link href={`/${slug}/perfil`} className={itemClass(isProfile)}>
        <User className="w-5 h-5" />
        Perfil
      </Link>
    </nav>
  );
}
