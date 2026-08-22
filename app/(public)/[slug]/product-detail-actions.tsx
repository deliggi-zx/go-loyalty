"use client";

import { useState } from "react";
import { ClipboardList, MessageCircle, X } from "lucide-react";
import { useCart } from "./cart-context";

interface ProductDetailActionsProps {
  productId: string;
  productName: string;
  price: number;
  imageUrl: string | null;
  primaryColor: string;
  whatsappNumber: string | null;
  // Fase Carrito→Favoritos: mismo patrón que en ClientHeader/CartPanel/
  // ProductModal — ver comentario en ClientHeader. addItem/useCart de
  // abajo no cambian, solo el texto del botón.
  orgSlug?: string;
  // Fase Requisitos (Domus): texto ya resuelto server-side según el tipo
  // de operación de ESTA propiedad (venta/alquiler) — ver producto/[id]/
  // page.tsx. null/undefined para cualquier otra org, o si Domus todavía
  // no cargó el texto correspondiente en Configuración.
  requirementsText?: string | null;
}

// Fase 3: acciones de la ficha de producto — mismo "Agregar al carrito"
// que ya usa ProductModal (mismo CartProvider, sin inventar un mecanismo
// de pago nuevo) más un segundo botón de acción. Para Domus (Fase
// Requisitos) ese segundo botón es "Requisitos" — el de WhatsApp quedaba
// redundante con el botón flotante genérico (mismo número/destino, ver
// WhatsAppButton en layout.tsx), que igual sigue apareciendo sin cambios
// en esta página. El resto de las orgs sigue viendo "Consultar por
// WhatsApp" como siempre.
export function ProductDetailActions({
  productId,
  productName,
  price,
  imageUrl,
  primaryColor,
  whatsappNumber,
  orgSlug,
  requirementsText,
}: ProductDetailActionsProps) {
  const isDomus = orgSlug === "domus";
  const [added, setAdded] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const { addItem } = useCart();

  function handleAddToCart() {
    addItem({ id: productId, name: productName, price, imageUrl });
    setAdded(true);
  }

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola! Quería consultar por "${productName}"`
      )}`
    : null;

  return (
    <div className="space-y-2.5">
      <button
        onClick={handleAddToCart}
        disabled={added}
        className="w-full py-3 rounded-xl text-white font-medium transition-opacity disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {added ? "Agregado ✓" : isDomus ? "Agregar a favoritos" : "Agregar al carrito"}
      </button>

      {isDomus
        ? requirementsText && (
            <button
              onClick={() => setRequirementsOpen(true)}
              className="w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <ClipboardList className="w-4 h-4" />
              Requisitos
            </button>
          )
        : whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <MessageCircle className="w-4 h-4" />
              Consultar por WhatsApp
            </a>
          )}

      {isDomus && requirementsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setRequirementsOpen(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div className="relative w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl p-6 bg-white">
              <button
                onClick={() => setRequirementsOpen(false)}
                aria-label="Cerrar"
                className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-stone-900 mb-3 pr-6">Requisitos</h2>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{requirementsText}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
