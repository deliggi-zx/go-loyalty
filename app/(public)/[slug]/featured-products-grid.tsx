import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { FeaturedProduct } from "./data";

interface FeaturedProductsGridProps {
  products: FeaturedProduct[];
  primaryColor: string;
  // No existe hoy una página/modal de detalle de producto direccionable por
  // URL (ProductModal se abre solo con estado de React desde /precios) —
  // fallback confirmado en el Gate 0: cada card linkea al catálogo general.
  catalogHref: string;
}

// Grilla de productos marcados como destacados (products.is_featured, ver
// toggleProductFeatured en dashboard/catalogo). Vive DEBAJO de las fotos de
// promo existentes (loyalty_content tipo promo) — no las reemplaza ni las
// toca. Si no hay ningún producto destacado, no renderiza nada (ni título
// vacío ni espacio en blanco): el caller decide si mostrarla.
export function FeaturedProductsGrid({ products, primaryColor, catalogHref }: FeaturedProductsGridProps) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={catalogHref}
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
              ${product.price.toLocaleString("es-AR")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
