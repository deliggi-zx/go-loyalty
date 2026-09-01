"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateProductSpecs } from "./actions";

// Especificaciones de una propiedad (Domus / Kapusta). Reemplaza al editor
// genérico clave/valor (ProductSpecsManager, heredado del catálogo tipo
// e-commerce) por campos agrupados y orientados al rubro inmobiliario.
// Todo opcional. Se guarda sobre products.specs (JSONB) con
// updateProductSpecs, que reemplaza el objeto entero — este form arma ese
// objeto a partir de sus campos + los pares libres del final.

type FieldType = "text" | "number" | "select";

interface SpecField {
  key: string; // clave real en products.specs
  label: string;
  type: FieldType;
  options?: string[]; // para type "select"
  placeholder?: string;
  suffix?: string; // ej. "m²", "$"
}

interface SpecGroup {
  title: string;
  hint?: string;
  fields: SpecField[];
  highlight?: boolean;
}

// Los m² usan las mismas claves que ya lee el resto del sistema
// (m2_totales / m2_cubiertos — tasación, etc.); "ambientes" también lo usa
// el filtro público. El resto son claves nuevas, en español, para que se
// lean bien en la ficha pública.
const GROUPS: SpecGroup[] = [
  {
    title: "Ubicación",
    fields: [
      { key: "barrio", label: "Barrio / zona", type: "text", placeholder: "Ej. Palermo" },
      { key: "dirección", label: "Dirección", type: "text", placeholder: "Ej. Av. Santa Fe 3450" },
    ],
  },
  {
    title: "Superficie y ambientes",
    hint: "Los m² alimentan la tasación rápida y los filtros del sitio.",
    highlight: true,
    fields: [
      { key: "m2_totales", label: "Superficie total", type: "number", suffix: "m²", placeholder: "Ej. 80" },
      { key: "m2_cubiertos", label: "Superficie cubierta", type: "number", suffix: "m²", placeholder: "Ej. 68" },
      { key: "ambientes", label: "Ambientes", type: "number", placeholder: "Ej. 3" },
      { key: "dormitorios", label: "Dormitorios", type: "number", placeholder: "Ej. 2" },
      { key: "baños", label: "Baños", type: "number", placeholder: "Ej. 1" },
    ],
  },
  {
    title: "Construcción y estado",
    fields: [
      { key: "anio_construccion", label: "Año de construcción", type: "number", placeholder: "Ej. 2008" },
      { key: "antigüedad", label: "Antigüedad", type: "text", placeholder: "Ej. 15 años / a estrenar" },
      {
        key: "estado",
        label: "Estado",
        type: "select",
        options: ["A estrenar", "Usado", "A refaccionar"],
      },
      {
        key: "orientación",
        label: "Orientación",
        type: "select",
        options: ["Norte", "Sur", "Este", "Oeste", "Noreste", "Noroeste", "Sudeste", "Sudoeste"],
      },
      {
        key: "tipo_construccion",
        label: "Tipo de construcción",
        type: "text",
        placeholder: "Ej. Tradicional / steel frame",
      },
    ],
  },
  {
    title: "Servicios y expensas",
    fields: [
      {
        key: "gas",
        label: "Gas",
        type: "select",
        options: ["Natural", "Envasado", "Sin gas"],
      },
      { key: "expensas", label: "Expensas", type: "number", suffix: "$", placeholder: "Ej. 45000" },
      {
        key: "expensas_incluyen",
        label: "Las expensas incluyen",
        type: "text",
        placeholder: "Ej. Agua, portería, ascensor",
      },
      {
        key: "impuestos",
        label: "Impuestos (ABL / tasas)",
        type: "text",
        placeholder: "Ej. ABL $8.000/mes",
      },
      {
        key: "agua_cloacas",
        label: "Agua / cloacas",
        type: "text",
        placeholder: "Ej. Red pública / pozo",
      },
      { key: "depósito", label: "Depósito requerido", type: "text", placeholder: "Ej. 1 mes de alquiler" },
    ],
  },
];

// Cochera: elección con sub-tipo, aparte del checklist de comodidades.
const COCHERA_OPTIONS = ["Cubierta", "Descubierta", "Sí (sin especificar)"];

// Lista de comodidades — agregar acá es todo lo que hace falta para sumar
// una opción nueva al checklist.
const AMENITIES = [
  "Pileta",
  "Quincho",
  "Parrilla",
  "Baulera",
  "Seguridad 24hs",
  "Ascensor",
  "Apto profesional",
  "Admite mascotas",
  "Amoblado",
  "Balcón",
  "Terraza",
  "Patio",
  "Jardín",
  "Gimnasio",
  "SUM",
  "Laundry",
  "Solárium",
  "Cochera para visitas",
];

// Claves "viejas" de comodidades que pueden existir como booleanos sueltos
// en specs (seed / carga previa) — se migran al checklist / string
// "Comodidades" y se dejan de escribir sueltas.
const LEGACY_AMENITY_KEYS: Record<string, string> = {
  pileta: "Pileta",
  quincho: "Quincho",
  parrilla: "Parrilla",
  baulera: "Baulera",
  ascensor: "Ascensor",
  amoblado: "Amoblado",
  balcón: "Balcón",
  balcon: "Balcón",
  terraza: "Terraza",
  patio: "Patio",
  jardín: "Jardín",
  jardin: "Jardín",
};

const COMODIDADES_KEY = "Comodidades";
const COCHERA_KEY = "cochera";
// Se preserva tal cual aunque no tenga input (la operación se infiere de
// la categoría; specs.operación es solo un fallback para datos viejos).
const PRESERVED_KEYS = ["operación"];

const FIELD_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));
const MANAGED_KEYS = new Set<string>([
  ...FIELD_KEYS,
  ...Object.keys(LEGACY_AMENITY_KEYS),
  COMODIDADES_KEY,
  COCHERA_KEY,
  ...PRESERVED_KEYS,
]);

function truthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return ["true", "sí", "si", "1", "x"].includes(v.trim().toLowerCase());
  return false;
}

interface Props {
  productId: string;
  specs: Record<string, string>;
}

export function PropertySpecsForm({ productId, specs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Valores de los campos estructurados.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const k of FIELD_KEYS) v[k] = specs[k] != null ? String(specs[k]) : "";
    return v;
  });

  // Cochera.
  const [cochera, setCochera] = useState<string>(() => {
    const raw = specs[COCHERA_KEY];
    if (raw == null || raw === "") return "";
    if (COCHERA_OPTIONS.includes(String(raw))) return String(raw);
    return truthy(raw) ? "Sí (sin especificar)" : "";
  });

  // Comodidades: del string "Comodidades" + de claves legacy sueltas.
  const [amenities, setAmenities] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const joined = specs[COMODIDADES_KEY];
    if (typeof joined === "string") {
      for (const part of joined.split(/[,·|]/).map((s) => s.trim()).filter(Boolean)) set.add(part);
    }
    for (const [legacyKey, label] of Object.entries(LEGACY_AMENITY_KEYS)) {
      if (truthy(specs[legacyKey])) set.add(label);
    }
    return set;
  });

  // Pares libres = specs que NO maneja este form.
  const [freeRows, setFreeRows] = useState<{ key: string; value: string }[]>(() =>
    Object.entries(specs)
      .filter(([k]) => !MANAGED_KEYS.has(k))
      .map(([key, value]) => ({ key, value: String(value) }))
  );

  const dirty = () => setSaved(false);

  function setField(key: string, value: string) {
    dirty();
    setValues((prev) => ({ ...prev, [key]: value }));
  }
  function toggleAmenity(label: string) {
    dirty();
    setAmenities((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
  function setFreeRow(i: number, field: "key" | "value", value: string) {
    dirty();
    setFreeRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addFreeRow() {
    dirty();
    setFreeRows((prev) => [...prev, { key: "", value: "" }]);
  }
  function removeFreeRow(i: number) {
    dirty();
    setFreeRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Comodidades "viejas" cargadas antes (string libre) que no están en la
  // lista conocida — se muestran igual para no perderlas.
  const extraAmenities = useMemo(
    () => Array.from(amenities).filter((a) => !AMENITIES.includes(a)),
    [amenities]
  );

  function handleSave() {
    const out: Record<string, string> = {};

    // 1. preservados sin input
    for (const k of PRESERVED_KEYS) {
      if (specs[k] != null && String(specs[k]).trim()) out[k] = String(specs[k]).trim();
    }
    // 2. campos estructurados
    for (const k of FIELD_KEYS) {
      const v = (values[k] ?? "").trim();
      if (v) out[k] = v;
    }
    // 3. cochera
    if (cochera) out[COCHERA_KEY] = cochera;
    // 4. comodidades → un solo string
    const list = Array.from(amenities).filter(Boolean);
    if (list.length > 0) out[COMODIDADES_KEY] = list.join(", ");
    // 5. pares libres (no manejados)
    for (const r of freeRows) {
      const k = r.key.trim();
      const v = r.value.trim();
      if (k && v && !MANAGED_KEYS.has(k)) out[k] = v;
    }

    startTransition(async () => {
      await updateProductSpecs(productId, out);
      setSaved(true);
    });
  }

  const inputClass =
    "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white";
  const labelClass = "text-xs font-medium text-stone-600";

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Especificaciones de la propiedad
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Todos los campos son opcionales. Se muestran en la ficha pública de la propiedad.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div
          key={group.title}
          className={`rounded-xl border p-5 space-y-4 ${
            group.highlight ? "border-amber-200 bg-amber-50/40" : "border-stone-200 bg-white"
          }`}
        >
          <div>
            <h3 className="text-sm font-semibold text-stone-800">{group.title}</h3>
            {group.hint && <p className="text-xs text-stone-400 mt-0.5">{group.hint}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {group.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className={labelClass}>
                  {f.label}
                  {f.suffix && <span className="text-stone-400"> ({f.suffix})</span>}
                </label>
                {f.type === "select" ? (
                  <select
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    min={f.type === "number" ? 0 : undefined}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Comodidades */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-800">Comodidades y amenities</h3>

        <div className="space-y-1.5 max-w-[220px]">
          <label className={labelClass}>Cochera</label>
          <select value={cochera} onChange={(e) => { dirty(); setCochera(e.target.value); }} className={inputClass}>
            <option value="">Sin cochera / no informado</option>
            {COCHERA_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={amenities.has(a)}
                onChange={() => toggleAmenity(a)}
                className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              {a}
            </label>
          ))}
          {extraAmenities.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked
                onChange={() => toggleAmenity(a)}
                className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              {a}
            </label>
          ))}
        </div>
      </div>

      {/* Características personalizadas (clave/valor libre) */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Características personalizadas</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Para lo que no entre en las categorías de arriba. Nombre del campo + su valor.
          </p>
        </div>

        {freeRows.length > 0 && (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg">
            {freeRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={row.key}
                  onChange={(e) => setFreeRow(i, "key", e.target.value)}
                  placeholder="Ej. Vista"
                  className="flex-1 h-9 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <input
                  value={row.value}
                  onChange={(e) => setFreeRow(i, "value", e.target.value)}
                  placeholder="Ej. Al río, sin edificios enfrente"
                  className="flex-[1.4] h-9 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeFreeRow(i)}
                  aria-label="Borrar"
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addFreeRow}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar característica
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar especificaciones"}
        </button>
        {saved && !isPending && (
          <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span>
        )}
      </div>
    </section>
  );
}
