"use client";

import { useState, useTransition } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { markOfferStock, markOfferMeeting, markOfferFollowup } from "./actions";

export interface OfferRow {
  id: string;
  ownerName: string;
  phone: string;
  operationType: "venta" | "alquiler";
  propertyType: string;
  address: string;
  neighborhood: string | null;
  requestedPrice: number;
  currency: string;
  rooms: number | null;
  totalSurface: number | null;
  coveredSurface: number | null;
  amenities: string | null;
  status: "nuevo" | "sumado_al_stock" | "reunion_agendada" | "seguimiento";
  createdAt: string;
  photoUrls: string[];
  // Fase 4a: solo tiene valor real una vez que se marcó "reunión
  // agendada" con fecha/hora — ver handleConfirmMeeting más abajo.
  scheduledAt: string | null;
}

interface OfertasManagerProps {
  offers: OfferRow[];
}

const STATUS_LABEL: Record<OfferRow["status"], string> = {
  nuevo: "Nuevo",
  sumado_al_stock: "Sumada al stock",
  reunion_agendada: "Reunión agendada",
  seguimiento: "En seguimiento",
};

const STATUS_BADGE_CLASS: Record<OfferRow["status"], string> = {
  nuevo: "bg-amber-50 text-amber-700",
  sumado_al_stock: "bg-emerald-50 text-emerald-700",
  reunion_agendada: "bg-sky-50 text-sky-700",
  seguimiento: "bg-violet-50 text-violet-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "YYYY-MM-DDTHH:MM" en hora LOCAL para precargar un <input
// type="datetime-local"> — igual que todos los otros pickers de fecha de
// Domus (ver todayLocalYmd en vet-appointments-config.ts), nunca
// toISOString() directo porque corre el día para cualquiera al oeste de
// UTC.
function nowLocalForInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

// Mismo espíritu simple que ConsultasManager (dashboard/consultas): solo
// lectura + acciones de estado, actualización optimista sin loading
// global. Acá cada fila tiene más datos (galería de fotos, ficha
// completa), por eso es una card en vez de una fila de tabla — mismo
// criterio de "card" que ya usa ConsultasManager, no una tabla nueva.
export function OfertasManager({ offers: initialOffers }: OfertasManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [offers, setOffers] = useState(initialOffers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Fase 4a: "reunión agendada" no es un cambio de estado directo como
  // los otros dos — primero hay que pedir fecha/hora. schedulingId marca
  // qué card está mostrando el input inline en vez del botón de siempre.
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduledAtInput, setScheduledAtInput] = useState("");

  function handleMark(id: string, status: "sumado_al_stock" | "seguimiento") {
    setUpdatingId(id);
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    startTransition(async () => {
      if (status === "sumado_al_stock") await markOfferStock(id);
      else await markOfferFollowup(id);
      setUpdatingId(null);
    });
  }

  function startScheduling(id: string) {
    setSchedulingId(id);
    setScheduledAtInput(nowLocalForInput());
  }

  function handleConfirmMeeting(id: string) {
    if (!scheduledAtInput) return;
    const scheduledAtIso = new Date(scheduledAtInput).toISOString();
    setUpdatingId(id);
    setOffers((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: "reunion_agendada", scheduledAt: scheduledAtIso } : o
      )
    );
    setSchedulingId(null);
    startTransition(async () => {
      await markOfferMeeting(id, scheduledAtIso);
      setUpdatingId(null);
    });
  }

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
        No hay ofertas todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {offers.map((offer) => {
        const details = [
          offer.rooms != null ? `${offer.rooms} amb.` : null,
          offer.coveredSurface != null ? `${offer.coveredSurface} m² cub.` : null,
          offer.totalSurface != null ? `${offer.totalSurface} m² tot.` : null,
        ].filter(Boolean);

        const otherStatuses = (["sumado_al_stock", "reunion_agendada", "seguimiento"] as const).filter(
          (s) => s !== offer.status
        );

        return (
          <div key={offer.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {offer.propertyType} en {offer.operationType === "venta" ? "venta" : "alquiler"}
                  {offer.neighborhood ? ` · ${offer.neighborhood}` : ""}
                </p>
                <p className="text-xs text-stone-500">{offer.address}</p>
                <p className="text-xs text-stone-400">
                  {offer.ownerName} · {offer.phone} · {formatDate(offer.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right space-y-1">
                <span
                  className={cn(
                    "inline-block px-2.5 py-1 rounded-full text-xs font-medium",
                    STATUS_BADGE_CLASS[offer.status]
                  )}
                >
                  {STATUS_LABEL[offer.status]}
                </span>
                {offer.status === "reunion_agendada" && offer.scheduledAt && (
                  <p className="text-xs text-stone-500">{formatDate(offer.scheduledAt)}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-stone-900">
                {formatPrice(offer.requestedPrice, offer.currency)}
              </span>
              {details.length > 0 && <span className="text-stone-500">{details.join(" · ")}</span>}
            </div>

            {offer.amenities && (
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{offer.amenities}</p>
            )}

            {offer.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {offer.photoUrls.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {schedulingId === offer.id ? (
              // Fase 4a: input simple, no un picker elaborado (pedido
              // explícito) — datetime-local nativo alcanza.
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="datetime-local"
                  value={scheduledAtInput}
                  onChange={(e) => setScheduledAtInput(e.target.value)}
                  className="h-9 px-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  disabled={!scheduledAtInput || isPending}
                  onClick={() => handleConfirmMeeting(offer.id)}
                  className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setSchedulingId(null)}
                  className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {otherStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isPending && updatingId === offer.id}
                    onClick={() =>
                      status === "reunion_agendada"
                        ? startScheduling(offer.id)
                        : handleMark(offer.id, status)
                    }
                    className="text-xs font-medium text-stone-500 hover:text-stone-800 disabled:opacity-50 transition-colors"
                  >
                    Marcar {STATUS_LABEL[status].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
