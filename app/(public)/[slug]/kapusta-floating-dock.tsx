"use client";

import { useState } from "react";
import { Calculator, MessageCircleQuestion, X } from "lucide-react";
import { DraggableFab } from "./draggable-fab";
import { KapustaCalcModal } from "./kapusta-calc-modal";
import { DomusChatPanel } from "./domus-chat-widget";

interface KapustaFloatingDockProps {
  slug: string;
  orgId: string;
  whatsappNumber: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const KAPUSTA_BLACK = "#0B1417";

// Dos accesos flotantes arrastrables para todo el sitio público de
// Kapusta (montado en layout.tsx, solo cuando slug === "kapusta"):
//
//  - Calculadoras (abajo a la izquierda por defecto) → abre el modal con
//    las 3 calculadoras (mismos componentes que /kapusta/calculadoras).
//  - Chat de IA (abajo a la derecha por defecto) → reemplaza, SOLO para
//    Kapusta, el DomusChatWidget de launcher fijo que se usaba en la home:
//    ahora el botón es arrastrable y vive en todas las rutas. Domus sigue
//    con el widget fijo de siempre (ver page.tsx).
//
// Cada botón guarda su posición en localStorage y se mantiene siempre
// dentro del viewport (ver draggable-fab.tsx). El link del drawer y la
// tarjeta del home a /kapusta/calculadoras siguen intactos: esto es un
// acceso extra.
export function KapustaFloatingDock({
  slug,
  orgId,
  whatsappNumber,
  primaryColor,
  secondaryColor,
  accentColor,
}: KapustaFloatingDockProps) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <DraggableFab
        storageKey="kapusta:fab:calc"
        defaultCorner="bottom-left"
        ariaLabel={calcOpen ? "Cerrar calculadoras" : "Abrir calculadoras"}
        onTap={() => setCalcOpen((o) => !o)}
        backgroundColor={primaryColor}
      >
        {calcOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Calculator className="w-6 h-6 text-white" />
        )}
      </DraggableFab>

      <DraggableFab
        storageKey="kapusta:fab:chat"
        defaultCorner="bottom-right"
        ariaLabel={chatOpen ? "Cerrar chat" : "Abrir chat"}
        onTap={() => setChatOpen((o) => !o)}
        backgroundColor={KAPUSTA_BLACK}
      >
        {chatOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircleQuestion className="w-7 h-7 text-white" />
        )}
      </DraggableFab>

      <KapustaCalcModal
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
      />

      <DomusChatPanel
        slug={slug}
        orgId={orgId}
        whatsappNumber={whatsappNumber}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Asistente Kapusta"
        humanPrompt="¿Preferís hablar con alguien del equipo?"
        accentColor={KAPUSTA_BLACK}
        positionClassName="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96"
      />
    </>
  );
}
