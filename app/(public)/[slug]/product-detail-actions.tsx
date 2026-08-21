"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
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
}

// Fase 3: acciones de la ficha de producto — mismo "Agregar al carrito"
// que ya usa ProductModal (mismo CartProvider, sin inventar un mecanismo
// de pago nuevo) más un botón de contacto directo por WhatsApp con el
// nombre del producto precargado en el mensaje (además del botón
// flotante genérico de WhatsAppButton, que sigue apareciendo igual en
// esta página — este es un CTA explícito dentro del cuerpo de la ficha).
export function ProductDetailActions({
  productId,
  productName,
  price,
  imageUrl,
  primaryColor,
  whatsappNumber,
  orgSlug,
}: ProductDetailActionsProps) {
  const isDomus = orgSlug === "domus";
  const [added, setAdded] = useState(false);
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

      {whatsappHref && (
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
    </div>
  );
}
