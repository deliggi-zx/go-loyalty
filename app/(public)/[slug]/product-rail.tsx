import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { CarouselProductItem } from "./data";
import { hasProductDetail } from "./product-detail-utils";

interface ProductRailProps {
  slug: string;
  title: string;
  products: CarouselProductItem[];
  primaryColor: string;
  // Mismo fallback que FeaturedProductsGrid: productos sin ficha propia
  // (sin specs cargadas) linkean al catálogo general en vez de a
  // /[slug]/producto/[id].
  catalogHref: string;
}

// Fase Home: estante horizontal de productos para los carruseles
// configurables del admin (ver dashboard/catalogo/carruseles) — no
// reusa el mecanismo de deslizamiento con loop de carousel.tsx a
// propósito: ese componente es para imágenes promocionales con autoplay
// (loyalty_content), acá son cards de producto navegables por el usuario
// con scroll horizontal simple, mismo patrón que la fila de pills de
// categorías en product-catalog.tsx. Sí reusa el criterio de link
// (hasProductDetail) y la estructura visual de card de
// featured-products-grid.tsx/product-catalog.tsx en vez de inventar una
// nueva. Genérico — cualquier org con catalog_type='products' puede
// tener carruseles, no es exclusivo de SuperElectro.
export function ProductRail({ slug, title, products, primaryColor, catalogHref }: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-900 px-1">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
        {products.map((product) => {
          const showCompareAt =
            product.compareAtPrice !== null && product.compareAtPrice > product.price;

          return (
            <Link
              key={product.id}
              href={
                hasProductDetail(product.specs) ? `/${slug}/producto/${product.id}` : catalogHref
              }
              className="shrink-0 w-36 sm:w-44 snap-start rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200 hover:shadow-md transition-shadow"
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
              <div className="p-3 space-y-1">
                {product.shippingBadgeText && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {product.shippingBadgeText}
                  </span>
                )}
                <p className="text-sm font-medium text-stone-900 line-clamp-2">{product.name}</p>
                {showCompareAt && (
                  <p className="text-xs text-stone-400 line-through">
                    ${product.compareAtPrice!.toLocaleString("es-AR")}
                  </p>
                )}
                <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                  ${product.price.toLocaleString("es-AR")}
                </p>
                {product.installmentsText && (
                  <p className="text-[11px] text-stone-500">{product.installmentsText}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
