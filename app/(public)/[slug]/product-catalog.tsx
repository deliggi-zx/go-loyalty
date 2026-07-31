"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ProductModal } from "./product-modal";
import type { CatalogCategory, CatalogProduct } from "./data";

interface ProductCatalogProps {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  primaryColor: string;
  initialCategoryId: string | null;
}

export function ProductCatalog({
  products,
  categories,
  primaryColor,
  initialCategoryId,
}: ProductCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategoryId);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveCategory(null)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              activeCategory === null
                ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "#fff" }
                : { borderColor: "#e7e5e4", color: "#57534e" }
            }
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
              style={
                activeCategory === cat.id
                  ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "#fff" }
                  : { borderColor: "#e7e5e4", color: "#57534e" }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <p className="text-center text-sm text-stone-400 py-16">
          Todavía no hay productos cargados en esta categoría.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const mainImage = [...product.images].sort(
              (a, b) => a.display_order - b.display_order
            )[0];
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                  {mainImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mainImage.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageOff className="w-8 h-8 text-stone-300" />
                  )}
                </div>
                <div className="p-3 space-y-0.5">
                  <p className="text-sm font-medium text-stone-900 line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                    ${product.price.toLocaleString("es-AR")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          primaryColor={primaryColor}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
