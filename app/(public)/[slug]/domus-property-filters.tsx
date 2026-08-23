"use client";

// Fase filtros de búsqueda (Domus): panel de filtros combinables para
// /domus/precios — reemplaza, SOLO para esta org, la fila de pills de
// categoría raíz de ProductCatalog (ver isDomus ahí). Gate 0: operación
// y tipo de propiedad ya se resuelven 100% por el árbol de categorías
// (2 raíces "Venta"/"Alquiler", cada una con las mismas 7 hojas —
// Departamentos/Casas/PH/Terrenos/Locales comerciales/Oficinas/
// Cocheras) — no hace falta un campo separado para ninguno de los dos,
// category_id ya alcanza (con fallback a specs.operación para los pocos
// productos viejos sin specs, mismo criterio que operationFromCategory
// en domus-chat-actions.ts). barrio/ambientes salen de specs (jsonb),
// nombres confirmados contra datos reales cargados hoy, no asumidos.

export interface DomusFilterState {
  operacion: "todas" | string;
  tipo: string; // "" = todas, si no un nombre de categoría hoja real
  zona: string; // "" = todas, si no un valor de specs.barrio real
  ambientesMin: "" | "1" | "2" | "3" | "4";
  priceCurrency: "USD" | "ARS";
  priceMin: string;
  priceMax: string;
}

export const DEFAULT_DOMUS_FILTERS: DomusFilterState = {
  operacion: "todas",
  tipo: "",
  zona: "",
  ambientesMin: "",
  priceCurrency: "USD",
  priceMin: "",
  priceMax: "",
};

export function hasActiveDomusFilters(f: DomusFilterState): boolean {
  return (
    f.operacion !== "todas" ||
    f.tipo !== "" ||
    f.zona !== "" ||
    f.ambientesMin !== "" ||
    f.priceMin !== "" ||
    f.priceMax !== ""
  );
}

interface DomusPropertyFiltersProps {
  filters: DomusFilterState;
  onChange: (filters: DomusFilterState) => void;
  primaryColor: string;
  // Operaciones/tipos/zonas: arrays ya armados dinámicamente en
  // product-catalog.tsx a partir del árbol de categorías y de
  // specs.barrio de los productos activos — este componente no decide
  // qué opciones existen, solo las pinta.
  tipos: string[];
  zonas: string[];
}

const selectClass =
  "h-9 px-2.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 transition-colors";
const labelClass = "text-xs font-medium text-stone-500";

export function DomusPropertyFilters({
  filters,
  onChange,
  primaryColor,
  tipos,
  zonas,
}: DomusPropertyFiltersProps) {
  function set<K extends keyof DomusFilterState>(key: K, value: DomusFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className={labelClass}>Operación</label>
          <select
            value={filters.operacion}
            onChange={(e) => set("operacion", e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="todas">Todas</option>
            <option value="Venta">Venta</option>
            <option value="Alquiler">Alquiler</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Tipo de propiedad</label>
          <select
            value={filters.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="">Todas</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Zona</label>
          <select
            value={filters.zona}
            onChange={(e) => set("zona", e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="">Todas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Ambientes</label>
          <select
            value={filters.ambientesMin}
            onChange={(e) => set("ambientesMin", e.target.value as DomusFilterState["ambientesMin"])}
            className={`${selectClass} w-full`}
          >
            <option value="">Todos</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelClass}>Precio</label>
        <div className="flex items-center gap-1.5">
          <select
            value={filters.priceCurrency}
            onChange={(e) => set("priceCurrency", e.target.value as DomusFilterState["priceCurrency"])}
            className={selectClass}
          >
            <option value="USD">US$</option>
            <option value="ARS">$</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Desde"
            value={filters.priceMin}
            onChange={(e) => set("priceMin", e.target.value)}
            className={`${selectClass} w-full min-w-0`}
          />
          <span className="text-stone-400 text-sm shrink-0">—</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Hasta"
            value={filters.priceMax}
            onChange={(e) => set("priceMax", e.target.value)}
            className={`${selectClass} w-full min-w-0`}
          />
        </div>
      </div>

      {hasActiveDomusFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_DOMUS_FILTERS)}
          className="text-xs font-medium transition-colors"
          style={{ color: primaryColor }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
