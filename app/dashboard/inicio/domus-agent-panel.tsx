"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Package, Eye, CalendarClock, Users } from "lucide-react";
import { getMorningSummary } from "./domus-morning-summary-actions";

// Fase Unificar panel del agente (antes "DomusMobileHome", solo para
// mobile en /dashboard/inicio y /dashboard — ver DashboardShell,
// hideMobileNav). Ahora es también el panel completo que ve el agente
// en /domus/perfil, sin distinción de viewport ahí (esa pantalla ya es
// angosta siempre) — mismos 5 destinos de siempre, sin tabla nueva.
// Badges rojos: ver domus-badge-counts.ts para el criterio exacto de
// cada contador; solo Consultas y Reuniones llevan uno, los otros 3
// botones no tienen badge (no fue pedido).
const DOMUS_AGENT_ITEMS = [
  {
    href: "/dashboard/inicio/consultas",
    label: "Consultas",
    icon: MessageSquare,
    badgeKey: "consultasNuevoCount" as const,
  },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: Package, badgeKey: null },
  { href: "/dashboard/inicio/seguimiento", label: "Seguimiento", icon: Eye, badgeKey: null },
  {
    href: "/dashboard/inicio/reuniones",
    label: "Reuniones",
    icon: CalendarClock,
    badgeKey: "reunionesHoyCount" as const,
  },
  { href: "/dashboard/inicio/contactos", label: "Cartera de clientes", icon: Users, badgeKey: null },
];

const DOMUS_NAVY = "#123B4A";
const DOMUS_SAND = "#D6B98C";
const DOMUS_IVORY = "#F8F6F1";

interface DomusAgentPanelProps {
  orgId: string;
  consultasNuevoCount: number;
  reunionesHoyCount: number;
}

export function DomusAgentPanel({ orgId, consultasNuevoCount, reunionesHoyCount }: DomusAgentPanelProps) {
  const countsByKey = { consultasNuevoCount, reunionesHoyCount };

  // Fase Resumen matutino: se pide al montar (una llamada a Gemini por
  // cada vez que este panel se monta — perfil, inicio, o el mobile de
  // /dashboard, ver los 3 callers), null mientras carga (skeleton), texto
  // ya resuelto una vez que vuelve. getMorningSummary nunca tira (cae a
  // un texto fijo si Gemini falla), así que acá no hace falta manejar un
  // estado de error aparte.
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    getMorningSummary(orgId).then((text) => {
      if (!cancelled) setSummary(text);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return (
    <div className="min-h-full p-4 space-y-3" style={{ backgroundColor: DOMUS_IVORY }}>
      <div className="rounded-2xl px-5 py-4 bg-white border border-stone-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
          Resumen del día
        </p>
        {summary === null ? (
          <div className="space-y-2 animate-pulse" aria-label="Cargando resumen del día">
            <div className="h-3 rounded bg-stone-200 w-full" />
            <div className="h-3 rounded bg-stone-200 w-4/5" />
          </div>
        ) : (
          <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>
        )}
      </div>

      {DOMUS_AGENT_ITEMS.map(({ href, label, icon: Icon, badgeKey }) => {
        const badgeCount = badgeKey ? countsByKey[badgeKey] : 0;
        return (
          <Link
            key={href}
            href={href}
            className="relative flex items-center gap-4 rounded-2xl px-5 py-5 shadow-sm active:opacity-90 transition-opacity"
            style={{ backgroundColor: DOMUS_NAVY }}
          >
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: DOMUS_SAND }}
            >
              <Icon className="w-6 h-6" style={{ color: DOMUS_NAVY }} />
            </span>
            <span className="text-lg font-semibold text-white">{label}</span>
            {badgeCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 border-2 border-white text-white text-xs font-bold flex items-center justify-center">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
