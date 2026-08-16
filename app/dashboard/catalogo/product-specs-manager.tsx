"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateProductSpecs } from "./actions";

interface SpecRow {
  key: string;
  value: string;
}

interface ProductSpecsManagerProps {
  productId: string;
  specs: Record<string, string>;
}

// Fase 3: editor de specs técnicas libres (clave-valor), sobre
// products.specs (JSONB) — genérico, mismo patrón visual que
// category-manager.tsx pero para pares clave/valor en vez de una lista
// simple. No exclusivo de SuperElectro: cualquier producto de cualquier
// org puede tener specs si se cargan acá.
export function ProductSpecsManager({ productId, specs }: ProductSpecsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<SpecRow[]>(
    Object.entries(specs).map(([key, value]) => ({ key, value }))
  );
  const [saved, setSaved] = useState(false);

  function updateRow(index: number, field: "key" | "value", value: string) {
    setSaved(false);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setSaved(false);
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    setSaved(false);
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const specsObject: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) specsObject[key] = value;
    }

    startTransition(async () => {
      await updateProductSpecs(productId, specsObject);
      setSaved(true);
    });
  }

  return (
    <section className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Especificaciones técnicas
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Pares libres clave/valor (ej. &ldquo;Potencia&rdquo; — &ldquo;1200W&rdquo;). Se
          muestran en la ficha de producto, en el orden que los cargues acá.
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2.5">
              <input
                value={row.key}
                onChange={(e) => updateRow(index, "key", e.target.value)}
                placeholder="Clave (ej. Potencia)"
                className="flex-1 h-9 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <input
                value={row.value}
                onChange={(e) => updateRow(index, "value", e.target.value)}
                placeholder="Valor (ej. 1200W)"
                className="flex-1 h-9 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                onClick={() => removeRow(index)}
                aria-label="Borrar fila"
                className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          Todavía no hay specs cargadas.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar fila
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar specs"}
        </button>
        {saved && !isPending && (
          <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span>
        )}
      </div>
    </section>
  );
}
