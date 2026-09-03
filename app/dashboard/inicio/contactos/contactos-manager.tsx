"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, MessageCircle, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddClientForm } from "./add-client-form";
import { ImportClientsDialog } from "./import-clients-dialog";
import { ContactShortcuts } from "./contact-shortcuts";
import { toCsv } from "./portfolio";
import { WhatsappBlast, type WaContact } from "./whatsapp-blast";

export interface ContactInteraction {
  type: "consulta" | "oferta" | "visita";
  createdAt: string;
  summary: string;
}

export interface ContactRow {
  id: string;
  // "account" = cliente con cuenta en el sitio (la cartera derivada de
  // siempre). "standalone" = cargado a mano o importado, sin cuenta.
  kind: "account" | "standalone";
  name: string;
  phone: string;
  email: string | null;
  profession: string | null;
  budgetRange: string | null;
  interestZone: string | null;
  // Solo para "standalone": si consintió recibir comunicaciones. En
  // "account" es null (no se registra ese consentimiento por esta vía).
  consintioComunicaciones: boolean | null;
  lastContactAt: string;
  interactions: ContactInteraction[];
}

interface ContactosManagerProps {
  contacts: ContactRow[];
  // Kapusta: tarjetas "simil vidrio" en vez de blancas, para que la
  // sección se sienta consistente con el panel. Default false = Domus.
  glass?: boolean;
  // Claves ya normalizadas (teléfono / mail) de todo lo que ya cuenta como
  // contacto — para la previsualización de duplicados al importar.
  existingPhones: string[];
  existingEmails: string[];
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

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Fase Cartera de clientes: antes esta pantalla era un Server Component
// puro (ordenado por interacción más reciente, sin buscador, historial
// siempre expandido, ver Gate 0) — se extrae a client component para
// poder ordenar alfabético + filtrar + colapsar sin ida y vuelta al
// server en cada tecla.
// Fase Cartera ampliada: suma alta manual, importación desde planilla,
// accesos rápidos de contacto (tel: / wa.me / mailto:) y exportación a CSV
// para herramientas de mailing externas.
export function ContactosManager({
  contacts,
  glass = false,
  existingPhones,
  existingEmails,
}: ContactosManagerProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Envío guiado de WhatsApp a varios: `selecting` prende los checkboxes en
  // la lista, `blasting` abre el modal (redactar mensaje + abrir wa.me uno
  // por uno). Solo se pueden tildar clientes con teléfono cargado.
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blasting, setBlasting] = useState(false);

  const cardClass = glass
    ? "kap-glass rounded-2xl p-4 space-y-3"
    : "bg-white rounded-xl border border-stone-200 p-4 space-y-3";
  const emptyClass = glass
    ? "kap-glass rounded-xl py-16 text-center text-[#0B1417]/60 text-sm"
    : "bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        )
      : contacts;
    // Alfabético por nombre — a diferencia del orden anterior (más
    // reciente primero), pedido explícito de esta fase.
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [contacts, search]);

  function handleExport() {
    // nombre + mail + consintio_comunicaciones de TODOS los clientes de la
    // cartera, para subir a una herramienta de mailing externa. El
    // consentimiento sólo se registra para los clientes sin cuenta; para
    // el resto va "no" (no se pidió por esta vía).
    const header = ["nombre", "mail", "consintio_comunicaciones"];
    const rows = [...contacts]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((c) => [c.name, c.email ?? "", c.consintioComunicaciones ? "si" : "no"]);
    triggerDownload(
      "cartera-clientes.csv",
      toCsv([header, ...rows]),
      "text/csv;charset=utf-8"
    );
  }

  // Un cliente se puede seleccionar para el envío solo si tiene teléfono
  // cargado ("—" es el placeholder cuando no hay dato).
  function hasPhone(c: ContactRow): boolean {
    return !!c.phone && c.phone.trim() !== "" && c.phone.trim() !== "—";
  }

  const eligibleFiltered = filtered.filter(hasPhone);
  const allEligibleSelected =
    eligibleFiltered.length > 0 && eligibleFiltered.every((c) => selectedIds.has(c.id));

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allEligibleSelected) {
        for (const c of eligibleFiltered) next.delete(c.id);
      } else {
        for (const c of eligibleFiltered) next.add(c.id);
      }
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  const blastContacts: WaContact[] = contacts
    .filter((c) => selectedIds.has(c.id) && hasPhone(c))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      consintioComunicaciones: c.consintioComunicaciones,
    }));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <AddClientForm glass={glass} />
        <ImportClientsDialog
          glass={glass}
          existingPhones={existingPhones}
          existingEmails={existingEmails}
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={contacts.length === 0}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40",
            glass
              ? "border-[#0B1417]/20 text-[#0B1417] hover:bg-white/30"
              : "border-stone-300 text-stone-700 hover:bg-stone-50"
          )}
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
        {!selecting && (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            disabled={contacts.length === 0}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40",
              glass
                ? "border-[#0B1417]/20 text-[#0B1417] hover:bg-white/30"
                : "border-stone-300 text-stone-700 hover:bg-stone-50"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            Enviar WhatsApp a varios
          </button>
        )}
      </div>

      {selecting && (
        <div
          className={cn(
            "sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
            glass ? "kap-glass border-transparent" : "bg-emerald-50 border-emerald-200"
          )}
        >
          <p className="text-sm font-semibold text-stone-800">
            {selectedIds.size === 0
              ? "Elegí los clientes"
              : `${selectedIds.size} ${selectedIds.size === 1 ? "cliente elegido" : "clientes elegidos"}`}
          </p>
          {eligibleFiltered.length > 0 && (
            <button
              type="button"
              onClick={toggleAllVisible}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              {allEligibleSelected ? "Quitar todos" : "Seleccionar todos"}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={exitSelection}
              className="h-9 px-3 rounded-lg bg-white border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setBlasting(true)}
              disabled={blastContacts.length === 0}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, mail o teléfono..."
        className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
      />

      {filtered.length === 0 ? (
        <div className={emptyClass}>
          {contacts.length === 0
            ? "Todavía no hay clientes en la cartera."
            : "Ningún cliente coincide con la búsqueda."}
        </div>
      ) : (
        filtered.map((c) => {
          const expanded = expandedId === c.id;
          const secondary = [
            c.profession && `Profesión: ${c.profession}`,
            c.budgetRange && `Presupuesto: ${c.budgetRange}`,
            c.interestZone && `Zona: ${c.interestZone}`,
          ].filter(Boolean);
          const eligible = hasPhone(c);
          const checked = selecting && eligible && selectedIds.has(c.id);
          return (
            <div
              key={c.id}
              className={cn(cardClass, checked && "ring-2 ring-emerald-400")}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selecting && (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!eligible}
                      onChange={() => toggleId(c.id)}
                      aria-label={
                        eligible ? `Seleccionar ${c.name}` : `${c.name} no tiene teléfono cargado`
                      }
                      className="h-4 w-4 shrink-0 rounded border-stone-300 disabled:opacity-40"
                    />
                  )}
                  <p className="text-sm font-semibold text-stone-900">{c.name}</p>
                  {c.kind === "standalone" && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      sin cuenta
                    </span>
                  )}
                  {c.consintioComunicaciones && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      consintió comunicaciones
                    </span>
                  )}
                  {selecting && !eligible && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">
                      sin teléfono
                    </span>
                  )}
                  {selecting && eligible && c.consintioComunicaciones !== true && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      <ShieldOff className="w-3 h-3" />
                      sin consentimiento registrado
                    </span>
                  )}
                </div>

                <ContactShortcuts phone={c.phone} email={c.email} />

                <p className="text-xs text-stone-400">
                  {c.kind === "account"
                    ? `Último contacto ${formatDate(c.lastContactAt)}`
                    : `Agregado el ${formatDate(c.lastContactAt)}`}
                </p>

                {secondary.length > 0 && (
                  <p className="text-xs text-stone-400">{secondary.join(" · ")}</p>
                )}
              </div>

              {c.interactions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    {expanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
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
                </>
              )}
            </div>
          );
        })
      )}

      {blasting && (
        <WhatsappBlast
          contacts={blastContacts}
          onClose={() => setBlasting(false)}
          onFinished={() => {
            setBlasting(false);
            exitSelection();
          }}
        />
      )}
    </div>
  );
}
