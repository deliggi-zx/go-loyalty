"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getKapustaCalcOptions } from "./kapusta-calculadoras-actions";
import { KapustaCalcTabs } from "./kapusta-calculadoras";

interface KapustaCalcModalProps {
  open: boolean;
  onClose: () => void;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Modal con las 4 calculadoras, disparado desde el botón flotante
// (kapusta-floating-dock.tsx). Reusa KapustaCalcTabs — la misma UI y
// lógica que /kapusta/calculadoras, sin duplicar nada.
//
// El contenido se muestra apenas se abre: la calculadora tradicional, el
// crédito y el ajuste de alquiler no necesitan datos del servidor. Solo
// la tasación usa tipos/zonas del catálogo — se piden en segundo plano y,
// hasta que llegan, esa pestaña muestra sus selectores vacíos con un
// aviso (no bloquea el resto del modal).
export function KapustaCalcModal({
  open,
  onClose,
  primaryColor,
  secondaryColor,
  accentColor,
}: KapustaCalcModalProps) {
  const [options, setOptions] = useState<{ tipos: string[]; zonas: string[] }>({
    tipos: [],
    zonas: [],
  });
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  useEffect(() => {
    if (!open || optionsLoaded) return;
    let cancelled = false;
    getKapustaCalcOptions()
      .then((res) => {
        if (!cancelled) {
          setOptions(res);
          setOptionsLoaded(true);
        }
      })
      .catch(() => {
        // Si falla, la tasación queda con sus opciones vacías y su propio
        // mensaje de "sin datos"; el resto del modal funciona igual.
        if (!cancelled) setOptionsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, optionsLoaded]);

  // Cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-lg bg-[#F8FAFB] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[88vh] sm:max-h-[85vh]">
        <div
          className="flex items-center justify-between px-4 h-14 rounded-t-2xl shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-sm font-semibold text-white">Calculadoras</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar calculadoras"
            className="p-1 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <KapustaCalcTabs
            tipos={options.tipos}
            zonas={options.zonas}
            optionsLoading={!optionsLoaded}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
}
