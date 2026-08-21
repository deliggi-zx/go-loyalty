"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stamp,
  Gift,
  Package,
  Ticket,
  GraduationCap,
  MapPin,
  PawPrint,
  CalendarClock,
  Home,
  MessageSquare,
  FileText,
  LayoutGrid,
  ScanLine,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/tarjetas", label: "Tarjetas", icon: Stamp },
  { href: "/dashboard/premios", label: "Premios", icon: Gift },
];

const catalogNavItem = { href: "/dashboard/catalogo", label: "Catálogo", icon: Package };

// Solo para orgs con gym_locations (hoy Gym2, a futuro cualquier org con
// features de gimnasio) — ver hasGymFeatures en dashboard/layout.tsx.
const gymNavItems = [
  { href: "/dashboard/invitaciones", label: "Invitaciones", icon: Ticket },
  { href: "/dashboard/profesores", label: "Profesores", icon: GraduationCap },
];

// Solo Corner (Fase 3) — ver showCourts en dashboard/layout.tsx, gateado
// por slug de la org (mismo criterio simple que isBike en page.tsx: un
// único flag en un único archivo, no amerita un mapa slug-keyed todavía).
const courtsNavItem = { href: "/dashboard/canchas", label: "Canchas", icon: MapPin };

// Solo Huellitas (Fase 1), y solo role admin/vet — ver showMascotas en
// dashboard/layout.tsx. Esto es únicamente el ítem de navegación; el
// control de acceso real (por role) vive en mascotas/page.tsx.
const mascotasNavItem = { href: "/dashboard/mascotas", label: "Mascotas", icon: PawPrint };

// Solo Huellitas (Fase 3), mismo gate que mascotasNavItem (admin/vet) —
// ver showTurnos en dashboard/layout.tsx. Ruta propia (/dashboard/turnos)
// en vez de una pestaña más dentro de Mascotas: son datos y acciones
// separados (otra tabla, otro flujo de cancelar vs. editar ficha), más
// simple mantenerlos en su propio archivo que seguir engordando
// mascotas-manager.tsx.
const turnosNavItem = { href: "/dashboard/turnos", label: "Turnos", icon: CalendarClock };

// Solo Domus (Fase 1), y solo role admin (hoy el único role que
// representa "agente" en esta org) — ver showVisitas en
// dashboard/layout.tsx. Mismo criterio que turnosNavItem: ruta propia en
// vez de una pestaña dentro de Catálogo, son datos y acciones separados.
const visitasNavItem = { href: "/dashboard/visitas", label: "Visitas", icon: Home };

// Solo Domus (Fase 2b), mismo gate que visitasNavItem (slug domus + role
// admin) — ver showConsultas en dashboard/layout.tsx.
const consultasNavItem = { href: "/dashboard/consultas", label: "Consultas", icon: MessageSquare };

// Solo Domus (Fase 3), mismo gate que consultasNavItem/visitasNavItem
// (slug domus + role admin) — ver showOfertas en dashboard/layout.tsx.
const ofertasNavItem = { href: "/dashboard/ofertas", label: "Ofertas", icon: FileText };

// Solo Domus (Fase 4b), mismo gate que el resto de Domus (slug domus +
// role admin) — ver showInicio en dashboard/layout.tsx. Va PRIMERO en el
// nav (antes que "Dashboard"), no reemplaza el redirect del login: ese
// sigue siendo /dashboard para todas las orgs (compartido, riesgoso de
// tocar — ver Gate 0 de la Fase 4). Mini-CRM del agente: Contactos/
// Consultas/Reuniones/Seguimiento, ver app/dashboard/inicio/page.tsx.
const inicioNavItem = { href: "/dashboard/inicio", label: "Inicio", icon: LayoutGrid };

const trailingNavItems = [
  { href: "/pos", label: "POS", icon: ScanLine },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail: string;
  showCatalog?: boolean;
  showGym?: boolean;
  showCourts?: boolean;
  showMascotas?: boolean;
  showTurnos?: boolean;
  showVisitas?: boolean;
  showConsultas?: boolean;
  showOfertas?: boolean;
  showInicio?: boolean;
}

export function Sidebar({
  userEmail,
  showCatalog = false,
  showGym = false,
  showCourts = false,
  showMascotas = false,
  showTurnos = false,
  showVisitas = false,
  showConsultas = false,
  showOfertas = false,
  showInicio = false,
}: SidebarProps) {
  const pathname = usePathname();
  const navItems = [
    ...(showInicio ? [inicioNavItem] : []),
    ...baseNavItems,
    ...(showCatalog ? [catalogNavItem] : []),
    ...(showGym ? gymNavItems : []),
    ...(showCourts ? [courtsNavItem] : []),
    ...(showMascotas ? [mascotasNavItem] : []),
    ...(showTurnos ? [turnosNavItem] : []),
    ...(showVisitas ? [visitasNavItem] : []),
    ...(showConsultas ? [consultasNavItem] : []),
    ...(showOfertas ? [ofertasNavItem] : []),
    ...trailingNavItems,
  ];

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-white border-r border-stone-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-stone-200">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12m0-9C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12" />
          </svg>
        </div>
        <span className="font-bold text-stone-900 text-base">Go Loyalty</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-amber-50 text-amber-700"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-amber-600" : "text-stone-400"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-stone-200 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs text-stone-400 truncate">{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <LogOut className="w-4 h-4 text-stone-400" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
