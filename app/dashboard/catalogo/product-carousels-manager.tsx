"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProductCarousels } from "./actions";

export interface CarouselOption {
  id: string;
  title: string;
  active: boolean;
}

interface ProductCarouselsManagerProps {
  productId: string;
  carousels: CarouselOption[];
  initialSelectedIds: string[];
}

// Fase Home: en qué carruseles configurables aparece este producto —
// checkbox por carrusel de la org (no por "estrellita" fija, ver
// is_featured/product-form para ese mecanismo aparte, sin tocar). Mismo
// patrón de guardado explícito que ProductSpecsManager (estado completo
// en memoria, un botón "Guardar" que reemplaza todo). Se muestran TODOS
// los carruseles de la org acá, activos o no — un producto puede quedar
// pre-asignado a un carrusel que todavía no se activó.
export function ProductCarouselsManager({
  productId,
  carousels,
  initialSelectedIds,
}: ProductCarouselsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      await updateProductCarousels(productId, Array.from(selected));
      setSaved(true);
    });
  }

  return (
    <section className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Carruseles
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          En qué carruseles de la home aparece este producto. Puede estar en varios a la vez, o en
          ninguno.
        </p>
      </div>

      {carousels.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {carousels.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              {c.title}
              {!c.active && (
                <span className="text-xs text-stone-400">(inactivo — no se muestra en la home)</span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 px-4 text-center text-stone-400 text-sm space-y-2">
          <p>Todavía no creaste ningún carrusel.</p>
          <Link
            href="/dashboard/catalogo/carruseles"
            className="inline-block text-amber-600 hover:text-amber-700 font-medium underline"
          >
            Crear el primero
          </Link>
        </div>
      )}

      {carousels.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {isPending ? "Guardando..." : "Guardar carruseles"}
          </button>
          {saved && !isPending && (
            <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span>
          )}
        </div>
      )}
    </section>
  );
}
