"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CatalogProduct } from "./data";
import { useCart } from "./cart-context";
import { ProductImageCarousel } from "./product-image-carousel";
import { formatPrice } from "@/lib/utils";

interface ProductModalProps {
  product: CatalogProduct;
  primaryColor: string;
  onClose: () => void;
  // Fase Carrito→Favoritos: mismo patrón que en ClientHeader/CartPanel —
  // ver comentario ahí. addItem/useCart de abajo no cambian, solo el
  // texto del botón.
  orgSlug?: string;
}

export function ProductModal({ product, primaryColor, onClose, orgSlug }: ProductModalProps) {
  const isDomus = orgSlug === "domus" || orgSlug === "kapusta";
  const images = [...product.images].sort((a, b) => a.display_order - b.display_order);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      // Fase video: la miniatura del carrito es un <img>, se salta un
      // video si quedó primero en la galería (images acá arriba se pasa
      // completo, con video incluido, a ProductImageCarousel — esto es
      // aparte, solo para esta miniatura puntual).
      imageUrl: images.find((img) => img.media_type !== "video")?.image_url ?? null,
    });
    setAdded(true);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-md max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <ProductImageCarousel images={images} alt={product.name} primaryColor={primaryColor} />

        <div className="p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>
            <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
              {formatPrice(product.price, product.currency)}
            </p>
          </div>

          {product.description && (
            <p className="text-sm text-stone-600 whitespace-pre-wrap">{product.description}</p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={added}
            className="w-full py-3 rounded-xl text-white font-medium transition-opacity disabled:opacity-70"
            style={{ backgroundColor: primaryColor }}
          >
            {added ? "Agregado ✓" : isDomus ? "Agregar a favoritos" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
