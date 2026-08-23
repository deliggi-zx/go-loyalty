"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  markInquiryContacted,
  markInquiryClosed,
  setInquiryTopic,
  suggestInquiryReply,
} from "./actions";

export interface InquiryRow {
  id: string;
  clientName: string;
  message: string;
  phone: string | null;
  status: "nuevo" | "contactado" | "cerrado";
  // Fase filtros de consultas: null hasta que el agente lo asigna al
  // leer la consulta — nunca lo elige el cliente al enviarla.
  topic: "compra" | "alquiler" | "desarrollo" | null;
  createdAt: string;
}

interface ConsultasManagerProps {
  inquiries: InquiryRow[];
}

const STATUS_LABEL: Record<InquiryRow["status"], string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cerrado: "Cerrado",
};

const STATUS_BADGE_CLASS: Record<InquiryRow["status"], string> = {
  nuevo: "bg-amber-50 text-amber-700",
  contactado: "bg-sky-50 text-sky-700",
  cerrado: "bg-stone-100 text-stone-500",
};

const TOPIC_LABEL: Record<NonNullable<InquiryRow["topic"]>, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  desarrollo: "Desarrollo",
};

const TOPIC_BADGE_CLASS: Record<NonNullable<InquiryRow["topic"]>, string> = {
  compra: "bg-emerald-50 text-emerald-700",
  alquiler: "bg-violet-50 text-violet-700",
  desarrollo: "bg-orange-50 text-orange-700",
};

type StatusFilter = "todas" | InquiryRow["status"];
type TopicFilter = "todas" | NonNullable<InquiryRow["topic"]>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Solo lectura + acciones simples (marcar estado, asignar tema) — mismo
// espíritu que TurnosManager (Huellitas): las filas se actualizan
// optimistamente, sin loading global. Fase filtros de consultas: filtros
// por estado/tema + buscador de texto libre, todo client-side (los datos
// ya están todos cargados, mismo criterio que categoryFilter en
// products-list.tsx) y combinables entre sí (AND, no OR).
export function ConsultasManager({ inquiries: initialInquiries }: ConsultasManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("todas");
  const [search, setSearch] = useState("");

  function handleMark(id: string, status: "contactado" | "cerrado") {
    setUpdatingId(id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    startTransition(async () => {
      if (status === "contactado") {
        await markInquiryContacted(id);
      } else {
        await markInquiryClosed(id);
      }
      setUpdatingId(null);
      router.refresh();
    });
  }

  function handleSetTopic(id: string, topic: NonNullable<InquiryRow["topic"]>) {
    setUpdatingId(id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, topic } : i)));
    startTransition(async () => {
      await setInquiryTopic(id, topic);
      setUpdatingId(null);
      router.refresh();
    });
  }

  // Fase B (borrador asistido): un draft por fila, editable a mano antes
  // de copiarlo — mismo criterio "el agente ajusta antes de mandar" que
  // pidió la fase, por eso vive en un textarea normal (value + onChange),
  // no en un texto de solo lectura. suggestingId marca qué fila está
  // esperando la respuesta de Gemini (loading puntual, no global).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [draftErrorId, setDraftErrorId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleSuggestReply(id: string) {
    setSuggestingId(id);
    setDraftErrorId(null);
    startTransition(async () => {
      const result = await suggestInquiryReply(id);
      setSuggestingId(null);
      if (result.ok) {
        setDrafts((prev) => ({ ...prev, [id]: result.draft }));
      } else {
        setDraftErrorId(id);
      }
    });
  }

  async function handleCopy(id: string) {
    const text = drafts[id];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (statusFilter !== "todas" && i.status !== statusFilter) return false;
      if (topicFilter !== "todas" && i.topic !== topicFilter) return false;
      if (q && !i.message.toLowerCase().includes(q) && !i.clientName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [inquiries, statusFilter, topicFilter, search]);

  const filterBtnClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
      active ? "bg-amber-100 text-amber-700" : "text-stone-500 hover:bg-stone-100"
    );

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          <button className={filterBtnClass(statusFilter === "todas")} onClick={() => setStatusFilter("todas")}>
            Todas
          </button>
          <button className={filterBtnClass(statusFilter === "nuevo")} onClick={() => setStatusFilter("nuevo")}>
            No leídas
          </button>
          <button
            className={filterBtnClass(statusFilter === "contactado")}
            onClick={() => setStatusFilter("contactado")}
          >
            Contactadas
          </button>
          <button className={filterBtnClass(statusFilter === "cerrado")} onClick={() => setStatusFilter("cerrado")}>
            Cerradas
          </button>
        </div>

        <div className="flex gap-1 flex-wrap">
          <button className={filterBtnClass(topicFilter === "todas")} onClick={() => setTopicFilter("todas")}>
            Todos los temas
          </button>
          <button className={filterBtnClass(topicFilter === "compra")} onClick={() => setTopicFilter("compra")}>
            Compras
          </button>
          <button className={filterBtnClass(topicFilter === "alquiler")} onClick={() => setTopicFilter("alquiler")}>
            Alquileres
          </button>
          <button
            className={filterBtnClass(topicFilter === "desarrollo")}
            onClick={() => setTopicFilter("desarrollo")}
          >
            Desarrollo
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por mensaje o nombre del cliente..."
          className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
          {inquiries.length === 0 ? "No hay consultas todavía." : "Ninguna consulta coincide con los filtros."}
        </div>
      ) : (
        filtered.map((row) => (
          <div key={row.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">{row.clientName}</p>
                <p className="text-xs text-stone-400">
                  {row.phone && <span className="text-stone-600">{row.phone} · </span>}
                  {formatDate(row.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {row.topic && (
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", TOPIC_BADGE_CLASS[row.topic])}>
                    {TOPIC_LABEL[row.topic]}
                  </span>
                )}
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", STATUS_BADGE_CLASS[row.status])}>
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
            </div>

            <p className="text-sm text-stone-700 whitespace-pre-wrap">{row.message}</p>

            {/* Selector rápido de tema — solo mientras no tiene uno
                asignado, opcional, el agente lo hace cuando quiere (no
                bloquea nada del flujo de estado de abajo). */}
            {!row.topic && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-stone-400">Tema:</span>
                <button
                  type="button"
                  disabled={isPending && updatingId === row.id}
                  onClick={() => handleSetTopic(row.id, "compra")}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 transition-colors"
                >
                  Compra
                </button>
                <button
                  type="button"
                  disabled={isPending && updatingId === row.id}
                  onClick={() => handleSetTopic(row.id, "alquiler")}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 transition-colors"
                >
                  Alquiler
                </button>
                <button
                  type="button"
                  disabled={isPending && updatingId === row.id}
                  onClick={() => handleSetTopic(row.id, "desarrollo")}
                  className="text-xs font-medium text-orange-600 hover:text-orange-800 disabled:opacity-50 transition-colors"
                >
                  Desarrollo
                </button>
              </div>
            )}

            {row.status !== "cerrado" && (
              <div className="flex items-center gap-3 pt-1">
                {row.status === "nuevo" && (
                  <button
                    type="button"
                    disabled={isPending && updatingId === row.id}
                    onClick={() => handleMark(row.id, "contactado")}
                    className="text-xs font-medium text-sky-600 hover:text-sky-800 disabled:opacity-50 transition-colors"
                  >
                    Marcar contactado
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending && updatingId === row.id}
                  onClick={() => handleMark(row.id, "cerrado")}
                  className="text-xs font-medium text-stone-500 hover:text-stone-800 disabled:opacity-50 transition-colors"
                >
                  Marcar cerrado
                </button>
                <button
                  type="button"
                  disabled={suggestingId === row.id}
                  onClick={() => handleSuggestReply(row.id)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 transition-colors"
                >
                  {suggestingId === row.id ? "Pensando..." : "Sugerir respuesta"}
                </button>
              </div>
            )}

            {/* Fase B: borrador editable + Copiar — se arma con Gemini
                (mensaje real de la consulta + tema, ver actions.ts), el
                agente lo ajusta acá mismo antes de pegarlo en WhatsApp. */}
            {draftErrorId === row.id && (
              <p className="text-xs text-red-600">
                No pudimos generar una sugerencia. Probá de nuevo.
              </p>
            )}
            {drafts[row.id] !== undefined && (
              <div className="space-y-1.5 pt-1">
                <textarea
                  value={drafts[row.id]}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(row.id)}
                  className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {copiedId === row.id ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
