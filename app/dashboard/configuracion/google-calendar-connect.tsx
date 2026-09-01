"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, CalendarX2 } from "lucide-react";
import { disconnectGoogleCalendar } from "./google-calendar-actions";

interface Props {
  configured: boolean;
  connectedEmail: string | null;
  connectedAt: string | null;
  canManage: boolean;
}

// Sección de Configuración (solo Kapusta) para conectar el Google Calendar
// compartido de la inmobiliaria. La conexión la hace el gerente una vez;
// después toda reunión cargada desde /dashboard/inicio/reuniones se
// espeja en ese calendario.
export function GoogleCalendarConnect({ configured, connectedEmail, connectedAt, canManage }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const feedback = params.get("calendar");
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await disconnectGoogleCalendar();
    setDisconnecting(false);
    router.replace("/dashboard/configuracion");
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">Google Calendar</h2>
        <p className="text-xs text-stone-400">
          Un solo calendario compartido para todo el equipo. Las reuniones que se cargan
          en Visitas/Reuniones se agregan también a este calendario.
        </p>
      </div>

      {feedback === "connected" && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Calendario conectado.
        </p>
      )}
      {feedback === "error" && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          No se pudo conectar. Probá de nuevo.
        </p>
      )}
      {feedback === "forbidden" && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Solo el gerente puede conectar el calendario.
        </p>
      )}
      {feedback === "notconfigured" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Faltan cargar las credenciales de Google en el servidor.
        </p>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        {!configured ? (
          <p className="text-sm text-stone-500">
            La integración todavía no está configurada en el servidor (faltan las
            credenciales de Google Cloud).
          </p>
        ) : connectedEmail || connectedAt ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-stone-900">
                  Conectado{connectedEmail ? ` como ${connectedEmail}` : ""}
                </p>
                {connectedAt && (
                  <p className="text-xs text-stone-400">
                    desde {new Date(connectedAt).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs font-medium text-stone-500 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
              >
                {disconnecting ? "Desconectando…" : "Desconectar"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <CalendarX2 className="w-5 h-5 text-stone-400 shrink-0" />
              Todavía no hay ningún calendario conectado.
            </div>
            {canManage ? (
              <a
                href="/api/google-calendar/connect"
                className="shrink-0 text-sm font-medium px-3 h-9 inline-flex items-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                Conectar Google Calendar
              </a>
            ) : (
              <span className="text-xs text-stone-400 shrink-0">Lo conecta el gerente</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
