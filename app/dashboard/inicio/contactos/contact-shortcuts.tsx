"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { mailtoHref, telHref, whatsappHref } from "./portfolio";

// Accesos rápidos de contacto para la lista/ficha de Cartera. Tocar el
// teléfono abre un menú con "Llamar" (tel:) y "Escribir por WhatsApp"
// (wa.me/); tocar el mail dispara mailto: — en el celular eso abre la app
// de teléfono / WhatsApp / correo directamente.
export function ContactShortcuts({
  phone,
  email,
}: {
  phone: string | null;
  email: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const hasPhone = !!phone && phone.trim() !== "" && phone.trim() !== "—";

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {hasPhone && (
        <span ref={wrapRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >
            <Phone className="w-3 h-3" />
            {phone}
          </button>
          {menuOpen && (
            <span className="absolute left-0 top-full z-20 mt-1 flex flex-col min-w-[180px] rounded-lg border border-stone-200 bg-white shadow-lg py-1">
              <a
                href={telHref(phone!)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => setMenuOpen(false)}
              >
                <Phone className="w-3.5 h-3.5" />
                Llamar
              </a>
              <a
                href={whatsappHref(phone!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => setMenuOpen(false)}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Escribir por WhatsApp
              </a>
            </span>
          )}
        </span>
      )}

      {email && (
        <a
          href={mailtoHref(email)}
          className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 transition-colors"
        >
          <Mail className="w-3 h-3" />
          {email}
        </a>
      )}
    </span>
  );
}
