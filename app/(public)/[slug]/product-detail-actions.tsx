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
  // Vertical inmobiliaria (cualquier nivel): el segundo botón pasa a ser
  // "Requisitos" en vez de "Consultar por WhatsApp".
  isRealEstate?: boolean;
  // Nivel Pro/360 de la vertical: "Agregar a favoritos" en vez de "Agregar
  // al carrito". Una inmobiliaria Básica no muestra ningún botón de
  // carrito/favoritos (def. 1).
  hasFavorites?: boolean;
  // Requisitos de operación (nivel Básica): texto ya resuelto server-side
  // según qué operaciones tiene activas ESTA propiedad — ver
  // producto/[id]/page.tsx. Fase operación dual: pueden venir los dos si
  // la propiedad está en venta y en alquiler a la vez (dos botones en vez
  // de uno); null/undefined si la org no tiene la feature, esa operación
  // no está activa, o todavía no se cargó el texto en Configuración.
  requirementsVenta?: string | null;
  requirementsAlquiler?: string | null;
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
  isRealEstate = false,
  hasFavorites = false,
  requirementsVenta,
  requirementsAlquiler,
}: ProductDetailActionsProps) {
  const isDomus = isRealEstate;
  const showAddButton = !isRealEstate || hasFavorites;
  const [added, setAdded] = useState(false);
  // Fase operación dual: con las dos activas hay dos textos — el modal
  // muestra el que se haya abierto ("venta" | "alquiler"), no un booleano.
  const [requirementsOpen, setRequirementsOpen] = useState<"venta" | "alquiler" | null>(null);
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
      {showAddButton && (
        <button
          onClick={handleAddToCart}
          disabled={added}
          className="w-full py-3 rounded-xl text-white font-medium transition-opacity disabled:opacity-70"
          style={{ backgroundColor: primaryColor }}
        >
          {added ? "Agregado ✓" : hasFavorites ? "Agregar a favoritos" : "Agregar al carrito"}
        </button>
      )}

      {isDomus ? (
        <>
          {/* Fase operación dual: un botón por cada operación con texto
              cargado — casi siempre uno solo, dos cuando la propiedad está
              en venta y en alquiler a la vez y ambos textos existen. */}
          {requirementsVenta && (
            <button
              onClick={() => setRequirementsOpen("venta")}
              className="w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <ClipboardList className="w-4 h-4" />
              {requirementsAlquiler ? "Requisitos de venta" : "Requisitos"}
            </button>
          )}
          {requirementsAlquiler && (
            <button
              onClick={() => setRequirementsOpen("alquiler")}
              className="w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <ClipboardList className="w-4 h-4" />
              {requirementsVenta ? "Requisitos de alquiler" : "Requisitos"}
            </button>
          )}
        </>
      ) : (
        whatsappHref && (
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
        )
      )}

      {isDomus && requirementsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setRequirementsOpen(null)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div className="relative w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl p-6 bg-white">
              <button
                onClick={() => setRequirementsOpen(null)}
                aria-label="Cerrar"
                className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold text-stone-900 mb-3 pr-6">Requisitos</h2>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {requirementsOpen === "venta" ? requirementsVenta : requirementsAlquiler}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
