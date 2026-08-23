"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { ProductModal } from "./product-modal";
import { CategoryDrilldown, type CatalogSelection } from "./category-drilldown";
import type { CatalogCategory, CatalogProduct } from "./data";
import { hasProductDetail } from "./product-detail-utils";
import { formatPrice } from "@/lib/utils";
import {
  DomusPropertyFilters,
  DEFAULT_DOMUS_FILTERS,
  hasActiveDomusFilters,
  type DomusFilterState,
} from "./domus-property-filters";

interface ProductCatalogProps {
  slug: string;
  products: CatalogProduct[];
  categories: CatalogCategory[];
  primaryColor: string;
  initialCategoryId: string | null;
}

// Breakpoint mobile para la cascada de categorías (Fase 1b SuperElectro) —
// mismo umbral que el "sm" de Tailwind, así el gate en JS y el `sm:hidden`
// del propio componente coinciden.
const MOBILE_BREAKPOINT = 640;

export function ProductCatalog({
  slug,
  products,
  categories,
  primaryColor,
  initialCategoryId,
}: ProductCatalogProps) {
  // Fase 1c: el filtro activo ya no es solo un category_id — puede venir
  // acotado además por marca o por rango de pulgadas (ver CatalogSelection
  // en category-drilldown.tsx). Desde la URL (?categoria=) o el pill row
  // solo puede llegar el caso "category"; brand/screenSize solo salen de
  // la cascada mobile.
  const [activeSelection, setActiveSelection] = useState<CatalogSelection | null>(
    initialCategoryId ? { type: "category", categoryId: initialCategoryId } : null
  );
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  // Categoría de nivel superior sobre la que se abrió la cascada mobile
  // (Fase 1b) — null cuando está cerrada. Hoy la única con hijas es
  // "TV y Audio"; cualquier otra categoría plana no la dispara nunca.
  const [drilldownRoot, setDrilldownRoot] = useState<CatalogCategory | null>(null);

  // Categorías de nivel superior (parent_id null) — son las que se ven
  // como pills. El resto de la jerarquía vive dentro de la cascada.
  const rootCategories = useMemo(
    () => categories.filter((c) => c.parent_id === null),
    [categories]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CatalogCategory[]>();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      const siblings = map.get(cat.parent_id) ?? [];
      siblings.push(cat);
      map.set(cat.parent_id, siblings);
    }
    return map;
  }, [categories]);

  // Fase filtros de búsqueda (Domus): reemplaza el pill row de arriba
  // por un panel de filtros combinables, SOLO para esta org — el resto
  // sigue con activeSelection/pills/cascada sin ningún cambio.
  const isDomus = slug === "domus";

  const categoryById = useMemo(() => {
    const map = new Map<string, CatalogCategory>();
    for (const cat of categories) map.set(cat.id, cat);
    return map;
  }, [categories]);

  // Fix bug filtro Alquiler/Venta (Domus): specs.operación primero,
  // category_id (root) como fallback — al revés que antes. Evidencia
  // real: "Casa 2 plantas" tenía category_id apuntando a Casas/Alquiler
  // por un error de carga (era Venta, corregido en la base), y no tenía
  // specs propias con las que contrastar — la categorización sola no es
  // confiable del todo (es un simple click al cargar el producto, más
  // fácil de equivocarse que escribir la operación a mano en la ficha).
  // specs.operación es el dato más explícito cuando existe, así que gana
  // — category_id sigue siendo necesario como único dato disponible
  // para los productos sin specs cargadas. "tipo" no tiene un campo
  // equivalente en specs para contrastar, sigue dependiendo 100% del
  // árbol de categorías.
  const resolveDomusLabels = useCallback(
    (product: CatalogProduct): { operacion: string | null; tipo: string | null } => {
      const leaf = product.category_id ? categoryById.get(product.category_id) : undefined;
      const root = leaf?.parent_id ? categoryById.get(leaf.parent_id) : undefined;
      return {
        operacion: product.specs?.["operación"] ?? root?.name ?? null,
        tipo: leaf?.name ?? null,
      };
    },
    [categoryById]
  );

  // Tipos y zonas del desplegable: dinámicos a partir de lo que existe
  // hoy entre los productos activos, no una lista fija — mismo criterio
  // que ya usa el chatbot para las zonas que menciona (Gate 0).
  const domusTipos = useMemo(() => {
    if (!isDomus) return [];
    return Array.from(
      new Set(products.map((p) => resolveDomusLabels(p).tipo).filter((t): t is string => !!t))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [isDomus, products, resolveDomusLabels]);

  const domusZonas = useMemo(() => {
    if (!isDomus) return [];
    return Array.from(
      new Set(products.map((p) => p.specs?.["barrio"]).filter((z): z is string => !!z))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [isDomus, products]);

  // Deep link desde el drawer (Venta > Departamentos, etc. — ver
  // side-menu.tsx) sigue funcionando: ?categoria=<hoja> precarga
  // Operación + Tipo en vez de activeSelection (que ya no se usa acá).
  const [domusFilters, setDomusFilters] = useState<DomusFilterState>(() => {
    if (!isDomus || !initialCategoryId) return DEFAULT_DOMUS_FILTERS;
    const leaf = categories.find((c) => c.id === initialCategoryId);
    const root = leaf?.parent_id ? categories.find((c) => c.id === leaf.parent_id) : undefined;
    return { ...DEFAULT_DOMUS_FILTERS, tipo: leaf?.name ?? "", operacion: root?.name ?? "todas" };
  });

  const domusFilteredProducts = useMemo(() => {
    if (!isDomus) return [];
    return products.filter((p) => {
      const { operacion, tipo } = resolveDomusLabels(p);
      if (domusFilters.operacion !== "todas" && operacion !== domusFilters.operacion) return false;
      if (domusFilters.tipo !== "" && tipo !== domusFilters.tipo) return false;
      if (domusFilters.zona !== "" && p.specs?.["barrio"] !== domusFilters.zona) return false;
      if (domusFilters.ambientesMin !== "") {
        const ambientes = Number(p.specs?.["ambientes"]);
        if (!Number.isFinite(ambientes) || ambientes < Number(domusFilters.ambientesMin)) return false;
      }
      // Precio: se filtra dentro de la moneda elegida, sin conversión
      // (Gate 0 — no hay tasa de cambio confiable en el proyecto, y
      // convertir sería inventar un dato). Sin Desde/Hasta cargado, la
      // moneda elegida no filtra nada por sí sola.
      if (domusFilters.priceMin !== "" || domusFilters.priceMax !== "") {
        if (p.currency !== domusFilters.priceCurrency) return false;
        if (domusFilters.priceMin !== "" && p.price < Number(domusFilters.priceMin)) return false;
        if (domusFilters.priceMax !== "" && p.price > Number(domusFilters.priceMax)) return false;
      }
      return true;
    });
  }, [isDomus, products, domusFilters, resolveDomusLabels]);

  // Todos los ids descendientes de una categoría (recursivo) — para que
  // filtrar por "TV y Audio" también traiga los productos cargados en sus
  // hijas (hoy category_id apunta siempre a una hoja, nunca al grupo).
  const descendantIds = useCallback(
    (categoryId: string): string[] => {
      const children = childrenByParent.get(categoryId) ?? [];
      return children.flatMap((c) => [c.id, ...descendantIds(c.id)]);
    },
    [childrenByParent]
  );

  const filteredProducts = useMemo(() => {
    if (!activeSelection) return products;

    const ids = new Set([activeSelection.categoryId, ...descendantIds(activeSelection.categoryId)]);
    let list = products.filter((p) => p.category_id !== null && ids.has(p.category_id));

    // Fase 1c: además del category_id, "TV por marca"/"TV por pulgadas"
    // acotan por un campo de producto — ver leaf_source en data.ts.
    if (activeSelection.type === "brand") {
      list = list.filter((p) => p.brand === activeSelection.brand);
    } else if (activeSelection.type === "screenSize") {
      list = list.filter((p) => {
        if (p.screen_size_inches === null) return false;
        if (activeSelection.min !== null && p.screen_size_inches < activeSelection.min) return false;
        if (activeSelection.max !== null && p.screen_size_inches > activeSelection.max) return false;
        return true;
      });
    }

    return list;
  }, [activeSelection, products, descendantIds]);

  function handlePillClick(cat: CatalogCategory) {
    const hasChildren = childrenByParent.has(cat.id);
    // Cascada solo en mobile (Fase 1b) — el mega menú de desktop queda
    // pospuesto, así que en desktop una categoría con hijas por ahora
    // filtra directo por sí misma + descendientes, igual que "Todos" pero
    // acotado a esa rama.
    if (hasChildren && typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT) {
      setDrilldownRoot(cat);
      return;
    }
    setActiveSelection({ type: "category", categoryId: cat.id });
  }

  // Fase filtros de búsqueda (Domus): esta org ya no usa
  // activeSelection/filteredProducts (pill row) — su propio estado y
  // filtrado, sin tocar el de arriba.
  const displayProducts = isDomus ? domusFilteredProducts : filteredProducts;
  const emptyMessage = isDomus
    ? "No hay propiedades que coincidan con esos filtros."
    : "Todavía no hay productos cargados en esta categoría.";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {isDomus ? (
        <DomusPropertyFilters
          filters={domusFilters}
          onChange={setDomusFilters}
          primaryColor={primaryColor}
          tipos={domusTipos}
          zonas={domusZonas}
        />
      ) : (
        rootCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveSelection(null)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              activeSelection === null
                ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "#fff" }
                : { borderColor: "#e7e5e4", color: "#57534e" }
            }
          >
            Todos
          </button>
          {rootCategories.map((cat) => {
            // Activo también cuando el filtro real es una subcategoría de
            // esta (ej. se eligió "Soportes y accesorios", o una marca/
            // rango de pulgadas bajo "TV y Audio", desde la cascada) — así
            // el pill padre queda resaltado.
            const isActive =
              activeSelection !== null &&
              (activeSelection.categoryId === cat.id ||
                descendantIds(cat.id).includes(activeSelection.categoryId));
            return (
              <button
                key={cat.id}
                onClick={() => handlePillClick(cat)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
                style={
                  isActive
                    ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "#fff" }
                    : { borderColor: "#e7e5e4", color: "#57534e" }
                }
              >
                {cat.name}
              </button>
            );
          })}
        </div>
        )
      )}

      {displayProducts.length === 0 ? (
        <p className="text-center text-sm text-stone-400 py-16">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {displayProducts.map((product) => {
            // Fase video: la card de la grilla renderiza con <img>, así
            // que se salta cualquier item de tipo 'video' al elegir la
            // portada — el video sí aparece en la galería completa (ver
            // ProductImageCarousel, dentro de la ficha de detalle).
            const mainImage = [...product.images]
              .sort((a, b) => a.display_order - b.display_order)
              .find((img) => img.media_type !== "video");
            const cardClassName =
              "relative text-left rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200 hover:shadow-md transition-shadow";
            const cardContent = (
              <>
                {/* Fase Reservas (Domus): badge visible en la grilla, no
                    solo en la ficha — para cualquier otra org `reserved`
                    siempre es false (ver getProductCatalog). */}
                {product.reserved && (
                  <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold uppercase tracking-wide text-white bg-stone-900/80 px-2 py-1 rounded-full">
                    Reservada
                  </span>
                )}
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
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </>
            );

            // Fase 4: solo los productos con specs cargadas linkean a la
            // ficha nueva (/[slug]/producto/[id]) — el resto sigue abriendo
            // el modal rápido de siempre, mismo comportamiento que antes de
            // esta fase. Ver hasProductDetail en data.ts.
            //
            // Fix bug carrusel/ficha (Domus): para esta org, la ficha es
            // donde viven Solicitar visita/Reservar/Requisitos — un
            // producto sin specs cargadas (8 de 14 hoy) igual es una
            // propiedad real que merece su ficha, nunca el modal rápido
            // (pensado para un producto simple tipo SKU, no aplica acá).
            // El resto de las orgs sigue exactamente igual, sin cambios.
            return hasProductDetail(product.specs) || isDomus ? (
              <Link key={product.id} href={`/${slug}/producto/${product.id}`} className={cardClassName}>
                {cardContent}
              </Link>
            ) : (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={cardClassName}
              >
                {cardContent}
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
          orgSlug={slug}
        />
      )}

      {drilldownRoot && (
        <CategoryDrilldown
          rootCategory={drilldownRoot}
          categories={categories}
          products={products}
          primaryColor={primaryColor}
          onSelect={(selection) => {
            setActiveSelection(selection);
            setDrilldownRoot(null);
          }}
          onClose={() => setDrilldownRoot(null)}
        />
      )}
    </div>
  );
}
