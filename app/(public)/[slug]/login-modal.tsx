"use client";

import { X } from "lucide-react";
import { LoginForm } from "./login-form";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  // Estilo oscuro + acentos #ccff00 — hoy solo Gym2, decidido por quien
  // monta el modal (ClientHeader), no hay nada Gym2-específico acá.
  neonTheme?: boolean;
}

// Modal centrado que aloja el mismo LoginForm de siempre (variant="bare",
// sin su chrome de recuadro porque el modal ya aporta fondo/sombra). Es el
// destino del ícono de usuario del header.
export function LoginModal({ isOpen, onClose, primaryColor, neonTheme = false }: LoginModalProps) {
  const panelClass = neonTheme
    ? "bg-[#0a0a0b] border border-[#26262a]"
    : "bg-white";
  const closeBtnClass = neonTheme
    ? "text-[#9b9995] hover:text-[#ccff00]"
    : "text-stone-400 hover:text-stone-700";

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center px-4 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`relative w-full max-w-sm rounded-2xl shadow-xl p-6 transition-transform duration-200 ${panelClass} ${
            isOpen ? "scale-100" : "scale-95"
          }`}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className={`absolute top-3 right-3 p-1.5 transition-colors ${closeBtnClass}`}
          >
            <X className="w-5 h-5" />
          </button>

          <LoginForm primaryColor={primaryColor} variant="bare" neonTheme={neonTheme} />
        </div>
      </div>
    </>
  );
}
