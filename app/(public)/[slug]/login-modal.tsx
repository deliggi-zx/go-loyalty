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
  // Estilo oscuro + acentos #ff6b00 — hoy solo "bike" (Fase 3j), mismo
  // mecanismo que neonTheme (ver darkChrome en login-form.tsx). El modal en
  // sí no se monta hoy para "bike" (showLoginIcon depende de hasGymFeatures
  // en layout.tsx), pero queda listo/consistente con el resto de
  // componentes que ya soportan ambos temas (ver side-menu.tsx).
  bikeTheme?: boolean;
  // Fase 0a de "Gym2 funcional": se pasan tal cual a LoginForm, ver ahí el
  // porqué de mantenerlos separados de neonTheme.
  requireInviteCode?: boolean;
  orgId?: string;
  // Fase registro extendido (Domus): se pasa tal cual a LoginForm, ver ahí
  // el porqué (campos nuevos de registro scopeados a esta org).
  orgSlug?: string;
}

// Modal centrado que aloja el mismo LoginForm de siempre (variant="bare",
// sin su chrome de recuadro porque el modal ya aporta fondo/sombra). Es el
// destino del ícono de usuario del header.
export function LoginModal({
  isOpen,
  onClose,
  primaryColor,
  neonTheme = false,
  bikeTheme = false,
  requireInviteCode = false,
  orgId,
  orgSlug,
}: LoginModalProps) {
  const darkChrome = neonTheme || bikeTheme;
  const panelClass = darkChrome
    ? "bg-[#0a0a0b] border border-[#26262a]"
    : "bg-white";
  const closeBtnClass = neonTheme
    ? "text-[#9b9995] hover:text-[#ccff00]"
    : bikeTheme
    ? "text-[#9b9995] hover:text-[#ff6b00]"
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

          <LoginForm
            primaryColor={primaryColor}
            variant="bare"
            neonTheme={neonTheme}
            bikeTheme={bikeTheme}
            requireInviteCode={requireInviteCode}
            orgId={orgId}
            orgSlug={orgSlug}
          />
        </div>
      </div>
    </>
  );
}
