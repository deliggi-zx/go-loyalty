"use client";

import { useState } from "react";
import { X, ShoppingCart, Star, Minus, Plus, ImageOff } from "lucide-react";
import { useCart } from "./cart-context";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  // Fase Carrito→Favoritos: mismo patrón que en ClientHeader — ver
  // comentario ahí. La lógica de items/cantidad/total de abajo es
  // exactamente la misma para las dos orgs, no se toca cart-context.
  orgSlug?: string;
}

export function CartPanel({ isOpen, onClose, primaryColor, orgSlug }: CartPanelProps) {
  const { items, setQuantity, clear } = useCart();
  const [confirmed, setConfirmed] = useState(false);
  const isDomus = orgSlug === "domus" || orgSlug === "kapusta";

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleClose() {
    setConfirmed(false);
    onClose();
  }

  function handleCheckout() {
    clear();
    setConfirmed(true);
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white z-[70] shadow-xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-stone-100 shrink-0">
          <span className="font-semibold text-stone-900">{isDomus ? "Favoritos" : "Carrito"}</span>
          <button
            onClick={handleClose}
            aria-label={isDomus ? "Cerrar favoritos" : "Cerrar carrito"}
            className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmed ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {isDomus ? (
                <Star className="w-6 h-6 text-white fill-current" />
              ) : (
                <ShoppingCart className="w-6 h-6 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-stone-900">¡Listo!</h3>
            <p className="text-sm text-stone-500">
              {isDomus
                ? "Un agente se va a poner en contacto a la brevedad."
                : "Te contactamos para coordinar el pago y la entrega."}
            </p>
            <button
              onClick={handleClose}
              className="mt-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Entendido
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            {isDomus ? (
              <Star className="w-10 h-10 text-stone-200 mb-3" />
            ) : (
              <ShoppingCart className="w-10 h-10 text-stone-200 mb-3" />
            )}
            <p className="text-sm text-stone-400">
              {isDomus ? "Todavía no marcaste ningún favorito." : "Todavía no agregaste nada."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-4">
                  <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageOff className="w-5 h-5 text-stone-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-stone-900 line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      ${item.price.toLocaleString("es-AR")} c/u
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          aria-label={`Restar unidad de ${item.name}`}
                          className="w-6 h-6 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium text-stone-900 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          aria-label={`Sumar unidad de ${item.name}`}
                          className="w-6 h-6 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                        ${(item.price * item.quantity).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 p-4 space-y-3 shrink-0">
              {/* Fase Favoritos sin total: sumar precios de propiedades no
                  tiene sentido conceptual (no se "compran" varias juntas
                  en un checkout) — el precio por-ítem de arriba sí se
                  mantiene, es información real de cada propiedad. */}
              {!isDomus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-500">Total</span>
                  <span className="text-lg font-bold text-stone-900">
                    ${total.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              <button
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {/* Fase Carrito→Favoritos: placeholder simple para Domus,
                    sin funcionalidad real todavía (misma handleCheckout de
                    siempre: limpia y muestra la pantalla de confirmación) —
                    la conexión real con Consultas es la Fase 2, aparte. */}
                {isDomus ? "Enviar consulta" : "Finalizar compra"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
