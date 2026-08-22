"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  userEmail: string;
  showCatalog?: boolean;
  showGym?: boolean;
  showCourts?: boolean;
  showMascotas?: boolean;
  showTurnos?: boolean;
  showVisitas?: boolean;
  showConsultas?: boolean;
  showOfertas?: boolean;
  showReservas?: boolean;
  showInicio?: boolean;
  orgName?: string;
  orgLogo?: string | null;
  // Fase Home mobile Domus (CAMBIO 2): en mobile, un agente de Domus no
  // tiene acceso al sidebar completo — ni ícono ☰ ni drawer abrible. El
  // <Sidebar> igual queda montado (traslado fuera de pantalla, sin nada
  // que lo dispare) para no complicar el árbol condicional; en desktop
  // este flag no cambia nada, ahí siempre se ve completo.
  hideMobileNav?: boolean;
  children: React.ReactNode;
}

// Fase sidebar responsive: por debajo de md, el sidebar de w-60 fijo
// (pensado 100% para escritorio) se reemplaza por un drawer off-canvas —
// mismo patrón fixed+backdrop+translate-x que ya usan side-menu.tsx/
// cart-panel.tsx/login-modal.tsx del sitio público, para consistencia
// visual/técnica con el resto del proyecto. En md y superior, el
// comportamiento es exactamente el de siempre (sidebar fijo, sin drawer,
// sin backdrop) — ninguna org tuvo cambios en desktop.
export function DashboardShell({
  userEmail,
  showCatalog,
  showGym,
  showCourts,
  showMascotas,
  showTurnos,
  showVisitas,
  showConsultas,
  showOfertas,
  showReservas,
  showInicio,
  orgName,
  orgLogo,
  hideMobileNav = false,
  children,
}: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <Sidebar
      userEmail={userEmail}
      showCatalog={showCatalog}
      showGym={showGym}
      showCourts={showCourts}
      showMascotas={showMascotas}
      showTurnos={showTurnos}
      showVisitas={showVisitas}
      showConsultas={showConsultas}
      showOfertas={showOfertas}
      showReservas={showReservas}
      showInicio={showInicio}
      orgName={orgName}
      orgLogo={orgLogo}
      onNavigate={() => setOpen(false)}
    />
  );

  return (
    <div className="flex h-screen w-full bg-stone-50">
      {/* Backdrop — solo mobile, solo mientras el drawer está abierto. */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer en mobile (fixed, translate-x según open) / sidebar fijo
          en desktop (static, siempre visible) — mismo <Sidebar>, solo
          cambia el contenedor que lo posiciona. */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra mobile con ☰ — se saca por completo (no solo se oculta)
            para el agente de Domus en mobile, ver hideMobileNav arriba. */}
        {!hideMobileNav && (
          <div className="md:hidden h-12 shrink-0 bg-white border-b border-stone-200 flex items-center px-3 gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              className="p-1.5 -ml-1.5 text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-stone-900 truncate">
              {orgName ?? "Go Loyalty"}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
