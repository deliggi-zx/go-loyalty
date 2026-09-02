"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManualPoints } from "../actions";

interface Suggestions {
  visit: number;
  referral: number;
  review: number;
  operationPer1000: number;
}

type MotiveKey = "visit" | "operation" | "referral" | "review" | "other";

const MOTIVES: { key: MotiveKey; label: string; type: string }[] = [
  { key: "visit", label: "Asistió a una visita", type: "manual_visit" },
  { key: "operation", label: "Cerró una operación", type: "manual_operation" },
  { key: "referral", label: "Refirió a alguien que operó", type: "manual_referral" },
  { key: "review", label: "Dejó una reseña / testimonio", type: "manual_review" },
  { key: "other", label: "Otro", type: "manual_adjustment" },
];

export function AddPointsForm({
  customerId,
  suggestions,
}: {
  customerId: string;
  suggestions: Suggestions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [motive, setMotive] = useState<MotiveKey>("visit");
  const [amount, setAmount] = useState<string>(String(suggestions.visit));
  const [detail, setDetail] = useState("");

  // Solo para "Cerró una operación": valor de la operación + moneda, para
  // sugerir el monto (editable a mano después).
  const [opValue, setOpValue] = useState("");
  const [opCurrency, setOpCurrency] = useState<"USD" | "ARS">("USD");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const suggestedForOperation = useMemo(() => {
    const v = Number(opValue.replace(/[^\d.]/g, ""));
    if (!v || v <= 0) return null;
    return Math.floor(v / 1000) * suggestions.operationPer1000;
  }, [opValue, suggestions.operationPer1000]);

  function pickMotive(key: MotiveKey) {
    setMotive(key);
    setError(null);
    setDone(false);
    if (key === "visit") setAmount(String(suggestions.visit));
    else if (key === "referral") setAmount(String(suggestions.referral));
    else if (key === "review") setAmount(String(suggestions.review));
    else setAmount(""); // operation (se calcula) / other (a mano)
  }

  function applyOperationSuggestion() {
    if (suggestedForOperation != null) setAmount(String(suggestedForOperation));
  }

  function submit() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("El monto tiene que ser un número entero mayor a 0.");
      return;
    }
    const selected = MOTIVES.find((m) => m.key === motive)!;

    let detailToSend = detail.trim();
    if (motive === "operation" && opValue.trim()) {
      const opNote = `valor ${opCurrency} ${Number(
        opValue.replace(/[^\d.]/g, "")
      ).toLocaleString("es-AR")}`;
      detailToSend = detailToSend ? `${opNote} — ${detailToSend}` : opNote;
    }

    startTransition(async () => {
      const res = await addManualPoints({
        customerId,
        type: selected.type,
        amount: parsed,
        detail: detailToSend || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar.");
        return;
      }
      setDone(true);
      setDetail("");
      setOpValue("");
      router.refresh();
    });
  }

  const inputClass =
    "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 transition-colors";

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">Sumar puntos</h2>
        <p className="text-xs text-stone-400">
          El monto sugerido es editable. Los valores finales los define el cliente.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-500">Motivo</label>
        <select
          value={motive}
          onChange={(e) => pickMotive(e.target.value as MotiveKey)}
          className={inputClass}
        >
          {MOTIVES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {motive === "operation" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-500">
            Valor de la operación (opcional, para sugerir el monto)
          </label>
          <div className="flex gap-2">
            <select
              value={opCurrency}
              onChange={(e) => setOpCurrency(e.target.value as "USD" | "ARS")}
              className={`${inputClass} w-24 shrink-0`}
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej. 50000"
              value={opValue}
              onChange={(e) => setOpValue(e.target.value)}
              className={inputClass}
            />
          </div>
          {suggestedForOperation != null && (
            <button
              type="button"
              onClick={applyOperationSuggestion}
              className="text-xs font-medium text-amber-600 hover:text-amber-700"
            >
              Sugerido: {suggestedForOperation.toLocaleString("es-AR")} pts — usar este monto
            </button>
          )}
        </div>
      )}

      {motive === "other" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-500">Motivo del ajuste</label>
          <input
            type="text"
            placeholder="Escribí el motivo"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {motive !== "other" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-500">
            Detalle (opcional)
          </label>
          <input
            type="text"
            placeholder="Nota interna"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-500">Puntos a sumar</label>
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${inputClass} w-40`}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Puntos acreditados.
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {pending ? "Guardando…" : "Sumar puntos"}
      </button>
    </div>
  );
}
