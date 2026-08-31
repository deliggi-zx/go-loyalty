"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { getAjusteIclKapusta } from "./kapusta-calculadoras-actions";
import {
  CalcButton,
  CalcError,
  CalcField,
  CalcNote,
  CalcResultRow,
  calcFieldClass,
  type KapustaTheme,
} from "./kapusta-calc-shared";

// Calc 3 — Ajuste de alquiler por inflación (ICL), inspirada en la
// calculadora oficial del GCBA. Fuente de datos: serie ICL del BCRA
// ("Índice para Contratos de Locación", Ley 27.551), vía server action con
// cache de un día (ver getAjusteIclKapusta en kapusta-calculadoras-actions.ts).
//
//   alquiler_actualizado = alquiler_original * (ICL_fecha_destino / ICL_fecha_inicio)
//
// Si el BCRA no responde, la calc no se rompe: ofrece cargar los dos
// valores de ICL a mano, con link a la página del BCRA.

interface Props {
  theme: KapustaTheme;
}

const BCRA_ICL_PAGE = "https://www.bcra.gob.ar/estadisticas-indicadores/";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface OkData {
  iclInicio: number;
  iclDestino: number;
  fechaIclInicio: string;
  fechaIclDestino: string;
  factor: number;
}

export function KapustaCalcAlquiler({ theme }: Props) {
  const [monto, setMonto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaDestino, setFechaDestino] = useState(todayYmd());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OkData | null>(null);

  // Modo manual: se activa solo si el BCRA falla, o si el usuario lo pide.
  const [manual, setManual] = useState(false);
  const [iclInicioManual, setIclInicioManual] = useState("");
  const [iclDestinoManual, setIclDestinoManual] = useState("");

  const montoNum = Number(monto);
  const montoValido = Number.isFinite(montoNum) && montoNum > 0;

  const manualResult = useMemo(() => {
    const a = Number(iclInicioManual);
    const b = Number(iclDestinoManual);
    if (!montoValido || !Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
    const factor = b / a;
    return { factor, actualizado: montoNum * factor };
  }, [iclInicioManual, iclDestinoManual, montoNum, montoValido]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await getAjusteIclKapusta(fechaInicio, fechaDestino);
      if (res.ok) {
        setData({
          iclInicio: res.iclInicio,
          iclDestino: res.iclDestino,
          fechaIclInicio: res.fechaIclInicio,
          fechaIclDestino: res.fechaIclDestino,
          factor: res.factor,
        });
        return;
      }
      if (res.reason === "invalid") {
        setError(
          "Revisá las fechas: la de inicio tiene que ser anterior a la de actualización y posterior a junio de 2020."
        );
        return;
      }
      // bcra_unreachable | no_data → fallback a carga manual
      setManual(true);
      setError(
        "No pudimos consultar el índice del BCRA en este momento. Podés cargar los dos valores de ICL a mano."
      );
    } catch {
      setManual(true);
      setError(
        "No pudimos consultar el índice del BCRA en este momento. Podés cargar los dos valores de ICL a mano."
      );
    } finally {
      setLoading(false);
    }
  }

  const actualizado = data ? montoNum * data.factor : 0;
  const aumentoPct = data ? (data.factor - 1) * 100 : 0;

  return (
    <div className="space-y-4">
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
          {loading ? "Consultando el BCRA…" : "Calcular actualización"}
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
            label={`ICL ${data.fechaIclInicio}`}
            value={data.iclInicio.toLocaleString("es-AR", { maximumFractionDigits: 4 })}
          />
          <CalcResultRow
            theme={theme}
            label={`ICL ${data.fechaIclDestino}`}
            value={data.iclDestino.toLocaleString("es-AR", { maximumFractionDigits: 4 })}
          />
        </div>
      )}

      {/* Carga manual de ICL — fallback si el BCRA no responde, o a pedido */}
      {manual ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Cargar ICL manualmente</p>
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
            Buscá el valor del ICL para cada fecha en la{" "}
            <a
              href={BCRA_ICL_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: theme.secondary }}
            >
              página de estadísticas del BCRA
            </a>{" "}
            (serie &ldquo;Índice para Contratos de Locación (ICL)&rdquo;) y
            cargalos acá.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <CalcField label="ICL al inicio">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Ej. 21.54"
                value={iclInicioManual}
                onChange={(e) => setIclInicioManual(e.target.value)}
                className={calcFieldClass}
              />
            </CalcField>
            <CalcField label="ICL a la fecha">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Ej. 36.18"
                value={iclDestinoManual}
                onChange={(e) => setIclDestinoManual(e.target.value)}
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
          Cargar los valores de ICL manualmente
        </button>
      )}

      <CalcNote>
        Cálculo estimativo según la fórmula de ajuste por ICL (Ley 27.551).
        Verificá siempre las condiciones de actualización que figuran en tu
        contrato. El ICL lo publica el BCRA.
      </CalcNote>
    </div>
  );
}
