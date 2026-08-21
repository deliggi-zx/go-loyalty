"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { markInquiryContacted, markInquiryClosed } from "./actions";

export interface InquiryRow {
  id: string;
  clientName: string;
  message: string;
  phone: string | null;
  status: "nuevo" | "contactado" | "cerrado";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Solo lectura + dos acciones de estado (pedido explícito: nada más
// elaborado todavía) — mismo espíritu simple que TurnosManager
// (Huellitas): la fila se actualiza optimistamente, sin loading global.
export function ConsultasManager({ inquiries: initialInquiries }: ConsultasManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  if (inquiries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
        No hay consultas todavía.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {inquiries.map((row) => (
        <div key={row.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">{row.clientName}</p>
              <p className="text-xs text-stone-400">
                {row.phone && <span className="text-stone-600">{row.phone} · </span>}
                {formatDate(row.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-xs font-medium",
                STATUS_BADGE_CLASS[row.status]
              )}
            >
              {STATUS_LABEL[row.status]}
            </span>
          </div>

          <p className="text-sm text-stone-700 whitespace-pre-wrap">{row.message}</p>

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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
