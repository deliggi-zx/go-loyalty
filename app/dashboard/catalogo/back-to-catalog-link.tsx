"use client";

import Link from "next/link";

// Bug reportado por una clienta real (Kapusta, 08/09): después de cargar
// las fotos de una propiedad nueva, la lista de /dashboard/catalogo no se
// actualizaba sola al volver con el link "‹ Catálogo" (Next 14 puede
// servir el Router Cache del lado del cliente aunque revalidatePath ya
// corrió server-side — ver actions.ts, ya llama revalidatePath en cada
// mutación, pero eso no garantiza que la navegación de vuelta lo
// respete) y además la pantalla no quedaba arriba del todo. Como no veía
// la propiedad recién cargada, la volvió a cargar y quedó una publicación
// duplicada con nombre parecido en vez de la real.
//
// Fix: cuando justPublished es true (llegás acá con ?nuevo=1 desde el
// alta, ver product-form.tsx), este link deja de ser un <Link> de Next y
// hace una navegación dura (window.location) — full page load, cero
// ambigüedad de cache, scroll arriba garantizado por el propio browser.
// Se paga el costo de un reload completo, pero es un momento puntual (una
// vez por propiedad nueva), no la navegación de todos los días — para
// "‹ Catálogo" en una edición común (justPublished=false) se sigue usando
// el <Link> normal de siempre, sin tocar esa UX.
export function BackToCatalogLink({
  label,
  justPublished = false,
  variant = "text",
}: {
  label: string;
  justPublished?: boolean;
  variant?: "text" | "button";
}) {
  const className =
    variant === "button"
      ? "flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors w-fit"
      : "text-sm text-stone-400 hover:text-stone-700 transition-colors shrink-0";

  if (!justPublished) {
    return (
      <Link href="/dashboard/catalogo" className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href="/dashboard/catalogo?published=1"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = "/dashboard/catalogo?published=1";
      }}
    >
      {label}
    </a>
  );
}
