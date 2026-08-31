"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import {
  getAjusteAlquilerKapusta,
  type IndiceAlquiler,
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

// Calc — Ajuste de alquiler por inflación. Inspirada en la calculadora
// oficial del GCBA. El usuario elige el índice antes de calcular:
//
// - ICL (Índice para Contratos de Locación, Ley 27.551): lo publica el
//   BCRA, valor diario.
// - IPC (Nivel General Nacional): lo publica el INDEC, valor mensual.
//
// En los dos casos: alquiler_actualizado = original * (valor_B / valor_A).
// Toda la lógica de fuente/cache/fallback vive en
// getAjusteAlquilerKapusta (kapusta-calculadoras-actions.ts). Si la fuente
// no responde, se ofrece cargar los dos valores del índice a mano, con
// link a la página oficial correspondiente.

interface Props {
  theme: KapustaTheme;
}

const SOURCE_BY_INDICE: Record<IndiceAlquiler, { label: string; url: string; serieHint: string }> = {
  ICL: {
    label: "BCRA",
    url: "https://www.bcra.gob.ar/estadisticas-indicadores/",
    serieHint: "Índice para Contratos de Locación (ICL)",
  },
  IPC: {
    label: "INDEC",
    url: "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31",
    serieHint: "IPC Nivel General Nacional",
  },
};

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function monthLabel(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

interface OkData {
  indice: IndiceAlquiler;
  valorInicio: number;
  valorDestino: number;
  fechaValorInicio: string;
  fechaValorDestino: string;
  factor: number;
  mensual: boolean;
}

export function KapustaCalcAlquiler({ theme }: Props) {
  const [indice, setIndice] = useState<IndiceAlquiler>("ICL");
  const [monto, setMonto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaDestino, setFechaDestino] = useState(todayYmd());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OkData | null>(null);

  // Modo manual: se activa solo si la fuente falla, o si el usuario lo pide.
  const [manual, setManual] = useState(false);
  const [valorInicioManual, setValorInicioManual] = useState("");
  const [valorDestinoManual, setValorDestinoManual] = useState("");

  const source = SOURCE_BY_INDICE[indice];

  const montoNum = Number(monto);
  const montoValido = Number.isFinite(montoNum) && montoNum > 0;

  const manualResult = useMemo(() => {
    const a = Number(valorInicioManual);
    const b = Number(valorDestinoManual);
    if (!montoValido || !Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
    const factor = b / a;
    return { factor, actualizado: montoNum * factor };
  }, [valorInicioManual, valorDestinoManual, montoNum, montoValido]);

  function switchIndice(next: IndiceAlquiler) {
    setIndice(next);
    setData(null);
    setError(null);
    setManual(false);
    setValorInicioManual("");
    setValorDestinoManual("");
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await getAjusteAlquilerKapusta(indice, fechaInicio, fechaDestino);
      if (res.ok) {
        setData({
          indice: res.indice,
          valorInicio: res.valorInicio,
          valorDestino: res.valorDestino,
          fechaValorInicio: res.fechaValorInicio,
          fechaValorDestino: res.fechaValorDestino,
          factor: res.factor,
          mensual: res.mensual,
        });
        return;
      }
      if (res.reason === "invalid") {
        setError(
          `Revisá las fechas: la de inicio tiene que ser anterior a la de actualización y posterior a ${
            indice === "IPC" ? "diciembre de 2016" : "junio de 2020"
          }.`
        );
        return;
      }
      // source_unreachable | no_data → fallback a carga manual
      setManual(true);
      setError(
        `No pudimos consultar el índice ${indice} (${source.label}) en este momento. Podés cargar los dos valores a mano.`
      );
    } catch {
      setManual(true);
      setError(
        `No pudimos consultar el índice ${indice} (${source.label}) en este momento. Podés cargar los dos valores a mano.`
      );
    } finally {
      setLoading(false);
    }
  }

  const actualizado = data ? montoNum * data.factor : 0;
  const aumentoPct = data ? (data.factor - 1) * 100 : 0;
  const valueDecimals = indice === "IPC" ? 2 : 4;

  const segBtn = "flex-1 h-9 text-sm font-medium rounded-lg transition-colors";

  return (
    <div className="space-y-4">
      <CalcField label="Índice de ajuste">
        <div className="flex gap-2 rounded-xl bg-stone-100 p-1">
          {(["ICL", "IPC"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => switchIndice(opt)}
              className={segBtn}
              style={
                indice === opt
                  ? { backgroundColor: "#fff", color: theme.primary, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
                  : { color: "#78716c" }
              }
            >
              {opt === "ICL" ? "ICL · BCRA" : "IPC · INDEC"}
            </button>
          ))}
        </div>
      </CalcField>

      <div className="space-y-3">
        <CalcField label="Monto original del alquiler">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Ej. 250000"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={calcFieldClass}
          />
        </CalcField>

        <div className="grid grid-cols-2 gap-2.5">
          <CalcField label="Inicio del contrato" hint="O la última actualización">
            <input
              type="date"
              value={fechaInicio}
              max={todayYmd()}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={calcFieldClass}
            />
          </CalcField>
          <CalcField label="Actualizar a la fecha">
            <input
              type="date"
              value={fechaDestino}
              max={todayYmd()}
              onChange={(e) => setFechaDestino(e.target.value)}
              className={calcFieldClass}
            />
          </CalcField>
        </div>
      </div>

      {!manual && (
        <CalcButton
          theme={theme}
          disabled={!montoValido || !fechaInicio || !fechaDestino || loading}
          onClick={handleSubmit}
        >
          {loading ? `Consultando ${source.label}…` : "Calcular actualización"}
        </CalcButton>
      )}

      {error && <CalcError>{error}</CalcError>}

      {data && !manual && (
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: theme.accent, backgroundColor: "#f8fafb" }}
        >
          <CalcResultRow
            theme={theme}
            emphasis
            label="Alquiler actualizado"
            value={formatPrice(Math.round(actualizado), "ARS")}
          />
          <div className="h-px bg-stone-200" />
          <CalcResultRow
            theme={theme}
            label="Aumento"
            value={`${aumentoPct >= 0 ? "+" : ""}${aumentoPct.toFixed(1)}%  (×${data.factor.toFixed(4)})`}
          />
          <CalcResultRow
            theme={theme}
            label={`${data.indice} ${data.mensual ? monthLabel(data.fechaValorInicio) : data.fechaValorInicio}`}
            value={data.valorInicio.toLocaleString("es-AR", { maximumFractionDigits: valueDecimals })}
          />
          <CalcResultRow
            theme={theme}
            label={`${data.indice} ${data.mensual ? monthLabel(data.fechaValorDestino) : data.fechaValorDestino}`}
            value={data.valorDestino.toLocaleString("es-AR", { maximumFractionDigits: valueDecimals })}
          />

          {data.mensual && (
            <p className="text-[11px] leading-relaxed text-stone-500 pt-1">
              El IPC es mensual: el ajuste se calculó con el índice de{" "}
              {monthLabel(data.fechaValorInicio)} y {monthLabel(data.fechaValorDestino)} (último
              mes cerrado publicado), sin interpolar dentro del mes.
            </p>
          )}
        </div>
      )}

      {/* Carga manual — fallback si la fuente no responde, o a pedido */}
      {manual ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Cargar {indice} manualmente</p>
            <button
              type="button"
              onClick={() => {
                setManual(false);
                setError(null);
              }}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Volver
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Buscá el valor del {indice} para cada fecha en la{" "}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: theme.secondary }}
            >
              página oficial del {source.label}
            </a>{" "}
            (serie &ldquo;{source.serieHint}&rdquo;) y cargalos acá.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <CalcField label={`${indice} al inicio`}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={indice === "IPC" ? "Ej. 4261.53" : "Ej. 21.54"}
                value={valorInicioManual}
                onChange={(e) => setValorInicioManual(e.target.value)}
                className={calcFieldClass}
              />
            </CalcField>
            <CalcField label={`${indice} a la fecha`}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder={indice === "IPC" ? "Ej. 8500.00" : "Ej. 36.18"}
                value={valorDestinoManual}
                onChange={(e) => setValorDestinoManual(e.target.value)}
                className={calcFieldClass}
              />
            </CalcField>
          </div>

          {manualResult && (
            <div
              className="rounded-xl border p-4 space-y-2"
              style={{ borderColor: theme.accent, backgroundColor: "#fff" }}
            >
              <CalcResultRow
                theme={theme}
                emphasis
                label="Alquiler actualizado"
                value={formatPrice(Math.round(manualResult.actualizado), "ARS")}
              />
              <div className="h-px bg-stone-200" />
              <CalcResultRow
                theme={theme}
                label="Aumento"
                value={`${(manualResult.factor - 1) * 100 >= 0 ? "+" : ""}${(
                  (manualResult.factor - 1) *
                  100
                ).toFixed(1)}%  (×${manualResult.factor.toFixed(4)})`}
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="text-xs font-medium transition-colors"
          style={{ color: theme.secondary }}
        >
          Cargar los valores de {indice} manualmente
        </button>
      )}

      <CalcNote>
        Cálculo estimativo según la fórmula de ajuste por índice. El ICL lo
        publica el BCRA (Ley 27.551); el IPC Nivel General, el INDEC. Verificá
        siempre las condiciones de actualización que figuran en tu contrato.
      </CalcNote>
    </div>
  );
}
