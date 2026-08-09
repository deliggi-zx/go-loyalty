"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarClock, CircleDot, Activity, User } from "lucide-react";

// Bottom nav propio de Corner — componente aparte, NO pisa/toca SideMenu
// (el menú lateral ☰ que usan Cafetería/Bike/Gym2/Huellitas sigue
// intacto para esas orgs). Fase 2: todavía cosmético en 3 de los 5 items
// — Reservas/Actividad no tienen ruta propia todavía (Fase 3/4), así que
// apuntan a anclas/rutas ya existentes en vez de a un 404:
//   - Reservas y el ícono de cancha (central) bajan a la card "Tu
//     próxima reserva" de la home (id="reserva") — el flujo real de
//     reservar llega en Fase 4 (modal).
//   - Actividad usa /[slug]/perfil, que YA muestra historial de puntos
//     real (genérico, no específico de Corner) — mejor eso que un
//     placeholder vacío.
// Inicio y Perfil sí son rutas reales.
export function CornerBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const isHome = pathname === `/${slug}`;
  const isProfile = pathname === `/${slug}/perfil`;

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

      <a href={`/${slug}#reserva`} className={itemClass(false)}>
        <CalendarClock className="w-5 h-5" />
        Reservas
      </a>

      {/* Ícono central de cancha — más grande, destacado en verde, mismo
          destino que "Reservas" (acción primaria: reservar). */}
      <a
        href={`/${slug}#reserva`}
        aria-label="Reservar cancha"
        className="flex flex-col items-center justify-center flex-1"
      >
        <span className="w-11 h-11 rounded-full bg-[#1e8f4e] flex items-center justify-center -mt-5 shadow-[0_0_14px_rgba(30,143,78,0.55)] border-4 border-[#0a0a0b]">
          <CircleDot className="w-5 h-5 text-white" />
        </span>
      </a>

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
