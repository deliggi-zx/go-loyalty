"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CatalogCategory, CatalogProduct } from "./data";

// Selección final que produce la cascada — "category" es el caso de
// siempre (una hoja real de product_categories); "brand" y "screenSize"
// son los dos derivados de la Fase 1c (ver leaf_source). categoryId en
// los tres casos es el id de la categoría cuyos productos hay que listar
// (para brand/screenSize, el grupo padre — ej. "TV y Audio" — porque ahí
// es donde viven los productos reales, ver nota en category-drilldown).
export type CatalogSelection =
  | { type: "category"; categoryId: string }
  | { type: "brand"; categoryId: string; brand: string }
  | { type: "screenSize"; categoryId: string; label: string; min: number | null; max: number | null };

// Rangos fijos de "TV por pulgadas" — mismos cortes que pidió Die (Menos
// de 43" / 43" a 55" / Más de 55", sin solapamientos ni huecos entre sí).
interface ScreenSizeBucket {
  label: string;
  min: number | null;
  max: number | null;
}

function bucketOf(size: number): ScreenSizeBucket {
  if (size < 43) return { label: 'Menos de 43"', min: null, max: 43 };
  if (size <= 55) return { label: '43" a 55"', min: 43, max: 55 };
  return { label: 'Más de 55"', min: 55, max: null };
}

interface DerivedLeaf {
  key: string;
  label: string;
  selection: CatalogSelection;
}

// Un nivel de la cascada: o una categoría real (mostramos sus hijas de
// product_categories) o una pantalla derivada (mostramos leaves
// calculadas a partir de products.brand / products.screen_size_inches).
type PathEntry =
  | { kind: "category"; category: CatalogCategory }
  | { kind: "derived"; label: string; source: "brand" | "screen_size_inches"; poolCategoryId: string };

interface CategoryDrilldownProps {
  rootCategory: CatalogCategory;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  primaryColor: string;
  onSelect: (selection: CatalogSelection) => void;
  onClose: () => void;
}

// Navegación mobile en cascada (Fase 1b/1c SuperElectro) — pantalla
// completa, mismo patrón que el drill-down de Frávega: flecha "volver"
// arriba a la izquierda, X arriba a la derecha. Categoría → Grupo → Hojas.
// Genérico: funciona para cualquier org que arme su propia jerarquía de
// parent_id/leaf_source, no solo TV y Audio.
export function CategoryDrilldown({
  rootCategory,
  categories,
  products,
  primaryColor,
  onSelect,
  onClose,
}: CategoryDrilldownProps) {
  const [path, setPath] = useState<PathEntry[]>([{ kind: "category", category: rootCategory }]);
  const current = path[path.length - 1];

  const dbChildren = useMemo(() => {
    if (current.kind !== "category") return [];
    return categories
      .filter((c) => c.parent_id === current.category.id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [categories, current]);

  // Hojas derivadas de la pantalla actual (solo cuando current.kind ===
  // "derived") — distintas marcas u ocupación de rangos de pulgadas entre
  // los productos de la categoría padre (poolCategoryId). Vacío mientras
  // no haya productos cargados con esos datos (Fase 5, pendiente).
  const derivedLeaves = useMemo((): DerivedLeaf[] => {
    if (current.kind !== "derived") return [];
    const pool = products.filter((p) => p.category_id === current.poolCategoryId);

    if (current.source === "brand") {
      const brands = Array.from(
        new Set(pool.map((p) => p.brand).filter((b): b is string => !!b))
      ).sort((a, b) => a.localeCompare(b, "es"));
      return brands.map((brand) => ({
        key: brand,
        label: brand,
        selection: { type: "brand", categoryId: current.poolCategoryId, brand },
      }));
    }

    const presentBuckets = new Map<string, ScreenSizeBucket>();
    for (const p of pool) {
      if (p.screen_size_inches === null) continue;
      const bucket = bucketOf(p.screen_size_inches);
      presentBuckets.set(bucket.label, bucket);
    }
    return Array.from(presentBuckets.values()).map((bucket) => ({
      key: bucket.label,
      label: bucket.label,
      selection: {
        type: "screenSize",
        categoryId: current.poolCategoryId,
        label: bucket.label,
        min: bucket.min,
        max: bucket.max,
      },
    }));
  }, [current, products]);

  function canDrillInto(cat: CatalogCategory) {
    return cat.leaf_source !== null || categories.some((c) => c.parent_id === cat.id);
  }

  function handleTapCategory(cat: CatalogCategory) {
    if (cat.leaf_source === "brand" || cat.leaf_source === "screen_size_inches") {
      setPath((p) => [
        ...p,
        { kind: "derived", label: cat.name, source: cat.leaf_source as "brand" | "screen_size_inches", poolCategoryId: cat.parent_id ?? cat.id },
      ]);
      return;
    }
    if (categories.some((c) => c.parent_id === cat.id)) {
      setPath((p) => [...p, { kind: "category", category: cat }]);
      return;
    }
    onSelect({ type: "category", categoryId: cat.id });
  }

  function handleBack() {
    if (path.length <= 1) {
      onClose();
      return;
    }
    setPath((p) => p.slice(0, -1));
  }

  const title = current.kind === "category" ? current.category.name : current.label;
  const emptyMessage =
    current.kind === "derived"
      ? "Todavía no hay productos cargados con ese dato."
      : "Todavía no hay subcategorías cargadas acá.";

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col sm:hidden">
      <div
        className="flex items-center justify-between h-14 px-1 border-b-2 shrink-0"
        style={{ borderColor: primaryColor }}
      >
        <button
          onClick={handleBack}
          aria-label="Volver"
          className="p-3 text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-center text-sm font-semibold text-stone-900 truncate px-2">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-3 text-stone-600 hover:text-stone-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
        {current.kind === "category" &&
          (dbChildren.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-16 px-6">{emptyMessage}</p>
          ) : (
            dbChildren.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleTapCategory(cat)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-stone-800 text-sm hover:bg-stone-50 transition-colors"
              >
                {cat.name}
                {canDrillInto(cat) && <ChevronRight className="w-4 h-4 shrink-0 text-stone-300" />}
              </button>
            ))
          ))}

        {current.kind === "derived" &&
          (derivedLeaves.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-16 px-6">{emptyMessage}</p>
          ) : (
            derivedLeaves.map((leaf) => (
              <button
                key={leaf.key}
                onClick={() => onSelect(leaf.selection)}
                className="w-full text-left px-5 py-4 text-stone-800 text-sm hover:bg-stone-50 transition-colors"
              >
                {leaf.label}
              </button>
            ))
          ))}
      </div>
    </div>
  );
}
