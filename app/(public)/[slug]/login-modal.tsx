"use client";

import { X } from "lucide-react";
import { LoginForm } from "./login-form";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
}

// Modal centrado que aloja el mismo LoginForm de siempre (variant="bare",
// sin su chrome de recuadro porque el modal ya aporta fondo/sombra). Es el
// destino del ícono de usuario del header — pensado para Gym2, pero no hay
// nada Gym2-específico acá: quién lo muestra lo decide ClientHeader.
export function LoginModal({ isOpen, onClose, primaryColor }: LoginModalProps) {
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
          className={`relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 transition-transform duration-200 ${
            isOpen ? "scale-100" : "scale-95"
          }`}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <LoginForm primaryColor={primaryColor} variant="bare" />
        </div>
      </div>
    </>
  );
}
