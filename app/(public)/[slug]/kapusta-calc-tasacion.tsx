"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import {
  estimarTasacionKapusta,
  type TasacionResult,
} from "./kapusta-calculadoras-actions";
import {
  CalcButton,
  CalcError,
  CalcField,
  CalcNote,
  CalcResultRow,
  calcFieldClass,
  type KapustaTheme,
} from "./kapusta-calc-shared";

// Calc 2 — Precio por m² / tasación rápida. No existe una fuente pública
// gratuita y confiable de precio de mercado por zona en Argentina, así que
// esto se apoya 100% en el stock propio de Kapusta ya cargado (products +
// categorías). El server action junta las propiedades comparables (mismo
// tipo + operación, con superficie cargada), saca el precio promedio por
// m² y lo multiplica por la superficie ingresada. Ver
// estimarTasacionKapusta en kapusta-calculadoras-actions.ts.

interface Props {
  theme: KapustaTheme;
  tipos: string[];
  zonas: string[];
  // true mientras el modal del botón flotante todavía trae tipos/zonas del
  // catálogo (en la página /kapusta/calculadoras llegan ya resueltos).
  optionsLoading?: boolean;
}

export function KapustaCalcTasacion({ theme, tipos, zonas, optionsLoading = false }: Props) {
  const [superficie, setSuperficie] = useState("");
  const [tipo, setTipo] = useState(tipos[0] ?? "");
  const [operacion, setOperacion] = useState("Venta");
  const [zona, setZona] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TasacionResult | null>(null);

  // Si los tipos llegan después (modal), engancharse al primero apenas
  // aparezcan o si el elegido dejó de existir.
  useEffect(() => {
    if (tipos.length > 0 && !tipos.includes(tipo)) setTipo(tipos[0]);
  }, [tipos, tipo]);

  const optionsPending = optionsLoading && tipos.length === 0;
  const superficieNum = Number(superficie);
  const canSubmit =
    Number.isFinite(superficieNum) && superficieNum > 0 && !!tipo && !loading && !optionsPending;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await estimarTasacionKapusta({
        superficieM2: superficieNum,
        tipo,
        operacion,
        zona,
      });
      if (!res.ok) {
        setError("Revisá los datos ingresados e intentá de nuevo.");
        return;
      }
      setResult(res);
    } catch {
      setError("No pudimos calcular la estimación. Probá de nuevo en un momento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <CalcField label="Superficie (m²)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 60"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              className={calcFieldClass}
            />
          </CalcField>
          <CalcField label="Operación">
            <select
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              className={calcFieldClass}
            >
              <option value="Venta">Venta</option>
              <option value="Alquiler">Alquiler</option>
            </select>
          </CalcField>
        </div>

        <CalcField
          label="Tipo de propiedad"
          hint={optionsPending ? "Cargando tipos del catálogo…" : undefined}
        >
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={optionsPending}
            className={calcFieldClass}
          >
            {optionsPending && <option value="">Cargando…</option>}
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </CalcField>

        <CalcField
          label="Zona / barrio"
          hint="Opcional. Si no hay suficientes comparables en la zona, ampliamos la búsqueda."
        >
          <select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className={calcFieldClass}
          >
            <option value="">Cualquiera</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </CalcField>
      </div>

      <CalcButton theme={theme} disabled={!canSubmit} onClick={handleSubmit}>
        {loading ? "Calculando…" : "Estimar valor"}
      </CalcButton>

      {error && <CalcError>{error}</CalcError>}

      {result?.ok && result.insufficient && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          No hay propiedades comparables en el stock de Kapusta para ese tipo y
          operación con superficie cargada. Escribinos por WhatsApp y un
          colaborador te ayuda con una tasación.
        </div>
      )}

      {result?.ok && !result.insufficient && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: theme.accent, backgroundColor: "#f8fafb" }}
        >
          <div className="space-y-0.5">
            <p className="text-xs text-stone-500">Valor estimado (rango)</p>
            <p className="text-lg font-bold" style={{ color: theme.primary }}>
              {formatPrice(Math.round(result.low), result.currency)} –{" "}
              {formatPrice(Math.round(result.high), result.currency)}
            </p>
          </div>

          <div className="h-px bg-stone-200" />

          <CalcResultRow
            theme={theme}
            label="Referencia (promedio)"
            value={formatPrice(Math.round(result.estimate), result.currency)}
          />
          <CalcResultRow
            theme={theme}
            label="Precio promedio por m²"
            value={`${formatPrice(Math.round(result.avgPerM2), result.currency)}/m²`}
          />
          <CalcResultRow
            theme={theme}
            label="Comparables usados"
            value={`${result.count} ${result.count === 1 ? "propiedad" : "propiedades"}`}
          />

          {result.widened && (
            <p className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              No encontramos suficientes propiedades en esa zona. Ampliamos la
              búsqueda a todo el stock de Kapusta, así que el resultado es menos
              preciso.
            </p>
          )}
          {!result.widened && result.lowConfidence && (
            <p className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              El cálculo se apoya en menos de 3 propiedades comparables. Tomalo
              como una referencia gruesa.
            </p>
          )}
        </div>
      )}

      <CalcNote>
        Estimación basada exclusivamente en las propiedades publicadas por
        Kapusta que tienen superficie cargada. No es una tasación profesional ni
        un valor de mercado oficial.
      </CalcNote>
    </div>
  );
}
