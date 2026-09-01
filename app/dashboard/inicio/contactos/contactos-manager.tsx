"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactInteraction {
  type: "consulta" | "oferta" | "visita";
  createdAt: string;
  summary: string;
}

export interface ContactRow {
  profileId: string;
  name: string;
  phone: string;
  profession: string | null;
  budgetRange: string | null;
  interestZone: string | null;
  lastContactAt: string;
  interactions: ContactInteraction[];
}

interface ContactosManagerProps {
  contacts: ContactRow[];
  // Kapusta: tarjetas "simil vidrio" en vez de blancas, para que la
  // sección se sienta consistente con el panel. Default false = Domus.
  glass?: boolean;
}

const TYPE_LABEL: Record<ContactInteraction["type"], string> = {
  consulta: "Consulta",
  oferta: "Oferta de propiedad",
  visita: "Visita a propiedad",
};

const TYPE_BADGE_CLASS: Record<ContactInteraction["type"], string> = {
  consulta: "bg-sky-50 text-sky-700",
  oferta: "bg-violet-50 text-violet-700",
  visita: "bg-emerald-50 text-emerald-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fase Cartera de clientes: antes esta pantalla era un Server Component
// puro (ordenado por interacción más reciente, sin buscador, historial
// siempre expandido, ver Gate 0) — se extrae a client component para
// poder ordenar alfabético + filtrar + colapsar sin ida y vuelta al
// server en cada tecla. Mismo espíritu "solo lectura, sin acciones" que
// la versión anterior: las acciones de cambio de estado siguen viviendo
// en Consultas/Ofertas-Reservas/Visitas.
export function ContactosManager({ contacts, glass = false }: ContactosManagerProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardClass = glass
    ? "kap-glass rounded-2xl p-4 space-y-3"
    : "bg-white rounded-xl border border-stone-200 p-4 space-y-3";
  const emptyClass = glass
    ? "kap-glass rounded-xl py-16 text-center text-[#0B1417]/60 text-sm"
    : "bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
    // Alfabético por nombre — a diferencia del orden anterior (más
    // reciente primero), pedido explícito de esta fase.
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [contacts, search]);

  return (
    <div className="space-y-4 max-w-3xl">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
      />

      {filtered.length === 0 ? (
        <div className={emptyClass}>
          {contacts.length === 0 ? "Todavía no hay contactos." : "Ningún contacto coincide con la búsqueda."}
        </div>
      ) : (
        filtered.map((c) => {
          const expanded = expandedId === c.profileId;
          return (
            <div key={c.profileId} className={cardClass}>
              <div>
                <p className="text-sm font-semibold text-stone-900">{c.name}</p>
                <p className="text-xs text-stone-500">
                  {c.phone} · último contacto {formatDate(c.lastContactAt)}
                </p>
                {(c.profession || c.budgetRange || c.interestZone) && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {[
                      c.profession && `Profesión: ${c.profession}`,
                      c.budgetRange && `Presupuesto: ${c.budgetRange}`,
                      c.interestZone && `Zona: ${c.interestZone}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : c.profileId)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded
                  ? "Ocultar historial"
                  : `Ver historial completo (${c.interactions.length})`}
              </button>

              {expanded && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  {c.interactions.map((int, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm pt-1.5">
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium mt-0.5",
                          TYPE_BADGE_CLASS[int.type]
                        )}
                      >
                        {TYPE_LABEL[int.type]}
                      </span>
                      <span className="text-stone-600">{int.summary}</span>
                      <span className="text-stone-400 text-xs ml-auto shrink-0">
                        {formatDate(int.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
