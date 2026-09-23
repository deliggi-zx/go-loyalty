// Fix precio por contexto de operación (vertical inmobiliaria): products.price
// / products.currency son el precio "representativo" viejo — al guardar, se
// espeja el de venta si está activa (ver resolveDualOperation en
// dashboard/catalogo/actions.ts), así que una propiedad en venta Y alquiler
// mostraba el precio de venta en todos lados que leyeran `price`, incluido
// el carrusel "En alquiler". Cualquier card que muestre precio de una
// propiedad tiene que pasar por acá con el contexto en el que se muestra.
// Archivo aparte de data.ts por el mismo motivo que product-detail-utils.ts
// (lo importan componentes "use client").

export type CarouselOperation = "venta" | "alquiler";

export interface DualOperationFields {
  price: number;
  currency: string;
  sale_active: boolean;
  sale_price: number | null;
  sale_currency: string | null;
  rental_active: boolean;
  rental_price: number | null;
  rental_currency: string | null;
}

export interface DisplayPrice {
  // null cuando hay un solo precio (el contexto ya dice qué operación es).
  label: "Venta" | "Alquiler" | null;
  price: number;
  currency: string;
}

// ¿La propiedad tiene activa la operación del carrusel? Sin operación
// (carrusel mixto) entra cualquier producto, igual que antes.
export function matchesCarouselOperation(
  p: DualOperationFields,
  operation: CarouselOperation | null
): boolean {
  if (operation === "venta") return p.sale_active;
  if (operation === "alquiler") return p.rental_active;
  return true;
}

// Precio(s) a mostrar según el contexto:
// - operación puntual → solo el precio de esa operación.
// - sin operación y con las dos activas → los dos, con etiqueta (mismo
//   criterio que la grilla del catálogo y la ficha).
// - sin ninguna operación dual cargada (orgs no inmobiliarias) → el
//   price/currency único de siempre.
export function resolveDisplayPrices(
  p: DualOperationFields,
  operation: CarouselOperation | null
): DisplayPrice[] {
  const sale: DisplayPrice | null = p.sale_active
    ? { label: null, price: p.sale_price ?? 0, currency: p.sale_currency ?? p.currency }
    : null;
  const rental: DisplayPrice | null = p.rental_active
    ? { label: null, price: p.rental_price ?? 0, currency: p.rental_currency ?? p.currency }
    : null;

  if (!sale && !rental) return [{ label: null, price: p.price, currency: p.currency }];
  if (operation === "venta" && sale) return [sale];
  if (operation === "alquiler" && rental) return [rental];
  if (sale && rental) {
    return [
      { ...sale, label: "Venta" },
      { ...rental, label: "Alquiler" },
    ];
  }
  return [(sale ?? rental)!];
}
