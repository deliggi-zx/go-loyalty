"use client";

import { useRef, useState } from "react";
import { X, ImageOff } from "lucide-react";
import type { CatalogProduct } from "./data";
import { useCart } from "./cart-context";

interface ProductModalProps {
  product: CatalogProduct;
  primaryColor: string;
  onClose: () => void;
}

export function ProductModal({ product, primaryColor, onClose }: ProductModalProps) {
  const images = [...product.images].sort((a, b) => a.display_order - b.display_order);
  const [current, setCurrent] = useState(0);
  const [added, setAdded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const { addItem } = useCart();

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: images[0]?.image_url ?? null,
    });
    setAdded(true);
  }

  function goTo(index: number) {
    setCurrent((index + images.length) % images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const threshold = 40;
    if (deltaX > threshold) goTo(current - 1);
    else if (deltaX < -threshold) goTo(current + 1);
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

        {/* Carrusel de imágenes */}
        <div
          className="relative w-full aspect-square bg-stone-100 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            images.map((img, i) => (
              <div
                key={img.id}
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? "auto" : "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-10 h-10 text-stone-300" />
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={() => goTo(current - 1)}
                aria-label="Imagen anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-stone-700 text-lg transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => goTo(current + 1)}
                aria-label="Siguiente imagen"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow flex items-center justify-center text-stone-700 text-lg transition-colors"
              >
                ›
              </button>
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium">
                {current + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap px-4 pt-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => goTo(i)}
                aria-label={`Ver imagen ${i + 1}`}
                className="transition-all rounded-full"
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  backgroundColor: i === current ? primaryColor : "#d6d3d1",
                }}
              />
            ))}
          </div>
        )}

        <div className="p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>
            <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
              ${product.price.toLocaleString("es-AR")}
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
            {added ? "Agregado ✓" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
