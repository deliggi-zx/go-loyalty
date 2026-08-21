import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { FeaturedProduct } from "./data";
import { hasProductDetail } from "./product-detail-utils";
import { formatPrice } from "@/lib/utils";

interface FeaturedProductsGridProps {
  slug: string;
  products: FeaturedProduct[];
  primaryColor: string;
  // Fallback para productos sin ficha propia (sin specs cargadas, ver
  // hasProductDetail) — cada card de esos linkea al catálogo general en
  // vez de a /[slug]/producto/[id]. Antes de la Fase 4 era el único
  // destino posible; ahora es el fallback, no la regla.
  catalogHref: string;
}

// Grilla de productos marcados como destacados (products.is_featured, ver
// toggleProductFeatured en dashboard/catalogo). Vive DEBAJO de las fotos de
// promo existentes (loyalty_content tipo promo) — no las reemplaza ni las
// toca. Si no hay ningún producto destacado, no renderiza nada (ni título
// vacío ni espacio en blanco): el caller decide si mostrarla.
export function FeaturedProductsGrid({
  slug,
  products,
  primaryColor,
  catalogHref,
}: FeaturedProductsGridProps) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={hasProductDetail(product.specs) ? `/${slug}/producto/${product.id}` : catalogHref}
          className="text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
        >
          <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageOff className="w-8 h-8 text-stone-300" />
            )}
          </div>
          <div className="p-3 space-y-0.5">
            <p className="text-sm font-medium text-stone-900 line-clamp-2">{product.name}</p>
            <p className="text-sm font-semibold" style={{ color: primaryColor }}>
              {formatPrice(product.price, product.currency)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
