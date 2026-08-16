// Fase 4: criterio de "este producto tiene ficha propia" — compartido
// entre componentes server (page.tsx, precios/page.tsx no lo usan
// directo, pero data.ts sí al armar CatalogProduct/FeaturedProduct) y
// client (product-catalog.tsx, featured-products-grid.tsx). Vive en un
// archivo aparte de data.ts a propósito: data.ts importa `next/headers`
// (vía lib/supabase/server), así que un "use client" no puede importar
// ni una función pura de ahí sin arrastrar ese módulo entero al bundle
// del cliente y romper el build.
//
// Un producto sin ninguna spec cargada no gana nada con la ruta nueva
// (la tabla de specs no se muestra si está vacía, ver
// producto/[id]/page.tsx) así que esos siguen abriendo el modal rápido
// de siempre. Un solo lugar si el criterio cambia más adelante (ej. "o
// tiene 2+ fotos").
export function hasProductDetail(specs: Record<string, string> | null): boolean {
  return !!specs && Object.keys(specs).length > 0;
}
