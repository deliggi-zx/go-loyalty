"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import {
  CalcField,
  CalcNote,
  CalcResultRow,
  calcFieldClass,
  type KapustaTheme,
} from "./kapusta-calc-shared";

// Calc 1 — Simulador de crédito hipotecario, sistema francés (cuota fija),
// que es el estándar en Argentina. Todo el cálculo es client-side, no
// pega a ningún lado.
//
//   r     = tasa_anual / 12 / 100      (tasa mensual en decimal)
//   n     = plazo_años * 12            (cantidad de cuotas)
//   cuota = monto * (r * (1+r)^n) / ((1+r)^n - 1)

interface Props {
  theme: KapustaTheme;
}

const CURRENCIES = [
  { value: "ARS", label: "$ (ARS)" },
  { value: "USD", label: "US$ (USD)" },
];

export function KapustaCalcCredito({ theme }: Props) {
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [tasa, setTasa] = useState("");
  const [plazo, setPlazo] = useState("");

  const result = useMemo(() => {
    const capital = Number(monto);
    const tasaAnual = Number(tasa);
    const anios = Number(plazo);
    if (
      !Number.isFinite(capital) ||
      capital <= 0 ||
      !Number.isFinite(tasaAnual) ||
      tasaAnual < 0 ||
      !Number.isFinite(anios) ||
      anios <= 0
    ) {
      return null;
    }

    const r = tasaAnual / 12 / 100;
    const n = Math.round(anios * 12);
    const cuota =
      r === 0 ? capital / n : (capital * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    const total = cuota * n;
    const intereses = total - capital;

    return { cuota, total, intereses, n };
  }, [monto, tasa, plazo]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <CalcField label="Monto del crédito">
          <div className="flex gap-2">
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="h-10 w-24 shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2 text-sm focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 120000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="h-10 flex-1 min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
            />
          </div>
        </CalcField>

        <div className="grid grid-cols-2 gap-2.5">
          <CalcField label="Tasa de interés anual (%)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="Ej. 8.5"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              className={calcFieldClass}
            />
          </CalcField>
          <CalcField label="Plazo (años)">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              placeholder="Ej. 20"
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
              className={calcFieldClass}
            />
          </CalcField>
        </div>

        <p className="text-[11px] text-stone-400">
          Sistema francés (cuota fija) — el más usado para créditos hipotecarios
          en Argentina.
        </p>
      </div>

      {result && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: theme.accent, backgroundColor: "#f8fafb" }}
        >
          <CalcResultRow
            theme={theme}
            emphasis
            label="Cuota mensual estimada"
            value={formatPrice(Math.round(result.cuota), moneda)}
          />
          <div className="h-px bg-stone-200" />
          <CalcResultRow
            theme={theme}
            label={`Total a pagar (${result.n} cuotas)`}
            value={formatPrice(Math.round(result.total), moneda)}
          />
          <CalcResultRow
            theme={theme}
            label="Total de intereses"
            value={formatPrice(Math.round(result.intereses), moneda)}
          />
        </div>
      )}

      <CalcNote>
        Cálculo estimativo. No reemplaza la simulación oficial de tu entidad
        financiera. No contempla gastos de otorgamiento, seguros, sellados ni
        actualización del capital por índice (UVA u otros).
      </CalcNote>
    </div>
  );
}
