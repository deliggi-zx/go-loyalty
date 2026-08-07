"use client";

import { useState } from "react";
import { QrCode, X } from "lucide-react";

interface GymQrAccessProps {
  qrDataUrl: string;
  userName: string;
}

// Datos de showroom para "Tu actividad" — no vienen de una tabla de
// asistencia real (no existe todavía en el esquema, ni gym_member_classes
// registra entrada/salida). Fijos, no se recalculan ni se persisten en
// ningún lado.
const SHOWROOM_ACTIVITY = {
  visitsThisMonth: 12,
  hoursThisWeek: 4.5,
  lastVisit: "Ayer",
};

// Fase 4 del showroom de Gym2: acá el cliente tiene un QR personal fijo
// (carnet de socio) y es el GYM el que lo escanea con un lector propio para
// registrar entrada/salida — al revés del patrón de puntos de Fidelity
// Loyalty, donde el cliente escanea un QR del negocio. Esta fase construye
// solo el lado del cliente (mostrar el QR); el lector del lado admin queda
// para una fase aparte. El QR todavía no "significa" nada real porque no
// hay lector del otro lado.
export function GymQrAccess({ qrDataUrl, userName }: GymQrAccessProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0e] border border-[#26262a] hover:border-[#ccff00]/50 transition-colors text-left"
      >
        <QrCode className="w-5 h-5 neon-icon shrink-0" />
        <span className="flex-1 text-sm font-semibold text-white">Mi QR de acceso</span>
        <span className="text-[#6b6965]">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:max-w-sm max-h-[92vh] bg-[#0a0a0b] border border-[#26262a] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 border border-[#26262a] flex items-center justify-center text-[#9b9995] hover:text-[#ccff00] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 space-y-6 text-center">
              <h2 className="text-lg font-semibold text-white">Mi QR de acceso</h2>

              {/* Marco neón alrededor del chip blanco: el QR en sí va
                  negro sobre blanco (mismo contraste que un QR real),
                  la identidad de Gym2 vive en el marco, no en el código. */}
              <div className="mx-auto w-fit rounded-2xl border border-[#ccff00] bg-white p-4 shadow-[0_0_6px_#ccff00,0_0_20px_#ccff00,0_0_46px_rgba(204,255,0,0.55)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Código QR de socio" className="w-48 h-48" />
              </div>

              <p className="text-sm font-semibold text-white">{userName}</p>

              <div className="space-y-2 text-left bg-[#141416] border border-[#26262a] rounded-2xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
                  Tu actividad
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9b9995]">Este mes</span>
                  <span className="font-semibold text-white">
                    {SHOWROOM_ACTIVITY.visitsThisMonth} días
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9b9995]">Esta semana</span>
                  <span className="font-semibold text-white">
                    {SHOWROOM_ACTIVITY.hoursThisWeek} hs
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#9b9995]">Última visita</span>
                  <span className="font-semibold text-white">{SHOWROOM_ACTIVITY.lastVisit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
