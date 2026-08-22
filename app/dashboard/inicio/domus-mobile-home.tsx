import Link from "next/link";
import { MessageSquare, Package, Eye, CalendarClock, Users } from "lucide-react";

// Fase Home mobile Domus (CAMBIO 2): pantalla que ve un agente de Domus
// en mobile en vez del sidebar completo (ver DashboardShell,
// hideMobileNav) — mismos 4 destinos del mini-CRM de escritorio
// (MENU_ITEMS en app/dashboard/inicio/page.tsx) más "Catálogo", que ahí
// no está porque en escritorio el catálogo ya vive en su propio ítem del
// sidebar. Paleta propia de Domus (azul petróleo/arena/marfil), no la
// gris genérica del resto del dashboard — pedido explícito, esta
// pantalla es 100% mobile y 100% Domus, no hay riesgo de que otra org la
// vea. Se usa en dos lugares: app/dashboard/inicio/page.tsx (mobile) y
// app/dashboard/page.tsx (mobile, para que aterrizar en /dashboard desde
// el celular caiga acá también, sin tocar el redirect de login).
const DOMUS_MOBILE_ITEMS = [
  { href: "/dashboard/inicio/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: Package },
  { href: "/dashboard/inicio/seguimiento", label: "Seguimiento", icon: Eye },
  { href: "/dashboard/inicio/reuniones", label: "Reuniones", icon: CalendarClock },
  { href: "/dashboard/inicio/contactos", label: "Cartera de clientes", icon: Users },
];

const DOMUS_NAVY = "#123B4A";
const DOMUS_SAND = "#D6B98C";
const DOMUS_IVORY = "#F8F6F1";

export function DomusMobileHome() {
  return (
    <div className="min-h-full p-4 space-y-3" style={{ backgroundColor: DOMUS_IVORY }}>
      {DOMUS_MOBILE_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 rounded-2xl px-5 py-5 shadow-sm active:opacity-90 transition-opacity"
          style={{ backgroundColor: DOMUS_NAVY }}
        >
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: DOMUS_SAND }}
          >
            <Icon className="w-6 h-6" style={{ color: DOMUS_NAVY }} />
          </span>
          <span className="text-lg font-semibold text-white">{label}</span>
        </Link>
      ))}
    </div>
  );
}
