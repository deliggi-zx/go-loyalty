"use client";

import { useCallback, useEffect, useReducer } from "react";
import type { KapustaTheme } from "./kapusta-calc-shared";

// Calculadora tradicional — cuentas rápidas sueltas, sin nada específico
// de inmobiliaria. Es la primera pestaña del modal y la que se muestra al
// abrir el botón flotante. Todo client-side.
//
// El estado vive en un solo objeto manejado por useReducer, así las
// transiciones son funciones puras de `prev` y aguantan que el usuario
// apriete botones más rápido de lo que React re-renderiza.

type Op = "+" | "−" | "×" | "÷";

interface Props {
  theme: KapustaTheme;
}

interface State {
  display: string;
  acc: number | null;
  pendingOp: Op | null;
  overwrite: boolean;
}

type Action =
  | { type: "digit"; d: string }
  | { type: "dot" }
  | { type: "op"; op: Op }
  | { type: "equals" }
  | { type: "clear" }
  | { type: "negate" }
  | { type: "percent" }
  | { type: "backspace" };

const INITIAL: State = { display: "0", acc: null, pendingOp: null, overwrite: true };

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

// Recorta la basura de coma flotante sin romper enteros grandes.
function tidy(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  return String(parseFloat(n.toPrecision(12)));
}

function reducer(s: State, a: Action): State {
  const isError = s.display === "Error";
  if (isError && a.type !== "clear") return s;

  switch (a.type) {
    case "digit": {
      if (s.overwrite) return { ...s, display: a.d, overwrite: false };
      if (s.display === "0") return { ...s, display: a.d };
      if (s.display.replace("-", "").replace(".", "").length >= 12) return s;
      return { ...s, display: s.display + a.d };
    }
    case "dot": {
      if (s.overwrite) return { ...s, display: "0.", overwrite: false };
      return s.display.includes(".") ? s : { ...s, display: s.display + "." };
    }
    case "op": {
      const current = Number(s.display);
      if (s.pendingOp !== null && !s.overwrite && s.acc !== null) {
        const result = compute(s.acc, current, s.pendingOp);
        return { display: tidy(result), acc: result, pendingOp: a.op, overwrite: true };
      }
      return { ...s, acc: current, pendingOp: a.op, overwrite: true };
    }
    case "equals": {
      if (s.pendingOp === null || s.acc === null) return s;
      const result = compute(s.acc, Number(s.display), s.pendingOp);
      return { display: tidy(result), acc: null, pendingOp: null, overwrite: true };
    }
    case "clear":
      return INITIAL;
    case "negate":
      return s.display === "0" ? s : { ...s, display: tidy(Number(s.display) * -1) };
    case "percent":
      return { ...s, display: tidy(Number(s.display) / 100), overwrite: true };
    case "backspace": {
      if (s.overwrite) return s;
      const d = s.display;
      if (d.length <= 1 || (d.length === 2 && d.startsWith("-"))) {
        return { ...s, display: "0", overwrite: true };
      }
      return { ...s, display: d.slice(0, -1) };
    }
  }
}

export function KapustaCalcBasica({ theme }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { display, acc, pendingOp } = state;
  const error = display === "Error";

  // Teclado físico, por comodidad en desktop.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key;
      if (k >= "0" && k <= "9") dispatch({ type: "digit", d: k });
      else if (k === ".") dispatch({ type: "dot" });
      else if (k === "+") dispatch({ type: "op", op: "+" });
      else if (k === "-") dispatch({ type: "op", op: "−" });
      else if (k === "*") dispatch({ type: "op", op: "×" });
      else if (k === "/") {
        e.preventDefault();
        dispatch({ type: "op", op: "÷" });
      } else if (k === "Enter" || k === "=") {
        e.preventDefault();
        dispatch({ type: "equals" });
      } else if (k === "%") dispatch({ type: "percent" });
      else if (k === "Escape") dispatch({ type: "clear" });
      else if (k === "Backspace") dispatch({ type: "backspace" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const btnBase =
    "h-14 rounded-xl text-lg font-semibold flex items-center justify-center transition-colors select-none active:opacity-80";
  const numBtn = `${btnBase} bg-white border border-stone-200 text-stone-800`;
  const opBtn = `${btnBase} text-white`;
  const utilBtn = `${btnBase} bg-stone-100 text-stone-600`;

  const onOp = useCallback((op: Op) => dispatch({ type: "op", op }), []);
  const onDigit = useCallback((d: string) => dispatch({ type: "digit", d }), []);

  const keys: {
    label: string;
    onClick: () => void;
    cls: string;
    style?: React.CSSProperties;
    span2?: boolean;
    active?: boolean;
  }[] = [
    { label: "C", onClick: () => dispatch({ type: "clear" }), cls: utilBtn },
    { label: "±", onClick: () => dispatch({ type: "negate" }), cls: utilBtn },
    { label: "%", onClick: () => dispatch({ type: "percent" }), cls: utilBtn },
    { label: "÷", onClick: () => onOp("÷"), cls: opBtn, style: { backgroundColor: theme.secondary }, active: pendingOp === "÷" },
    { label: "7", onClick: () => onDigit("7"), cls: numBtn },
    { label: "8", onClick: () => onDigit("8"), cls: numBtn },
    { label: "9", onClick: () => onDigit("9"), cls: numBtn },
    { label: "×", onClick: () => onOp("×"), cls: opBtn, style: { backgroundColor: theme.secondary }, active: pendingOp === "×" },
    { label: "4", onClick: () => onDigit("4"), cls: numBtn },
    { label: "5", onClick: () => onDigit("5"), cls: numBtn },
    { label: "6", onClick: () => onDigit("6"), cls: numBtn },
    { label: "−", onClick: () => onOp("−"), cls: opBtn, style: { backgroundColor: theme.secondary }, active: pendingOp === "−" },
    { label: "1", onClick: () => onDigit("1"), cls: numBtn },
    { label: "2", onClick: () => onDigit("2"), cls: numBtn },
    { label: "3", onClick: () => onDigit("3"), cls: numBtn },
    { label: "+", onClick: () => onOp("+"), cls: opBtn, style: { backgroundColor: theme.secondary }, active: pendingOp === "+" },
    { label: "0", onClick: () => onDigit("0"), cls: numBtn, span2: true },
    { label: ".", onClick: () => dispatch({ type: "dot" }), cls: numBtn },
    { label: "=", onClick: () => dispatch({ type: "equals" }), cls: opBtn, style: { backgroundColor: theme.primary } },
  ];

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-right"
        aria-live="polite"
      >
        <span
          className="block font-bold tabular-nums break-all"
          style={{
            color: error ? "#dc2626" : theme.primary,
            fontSize: display.length > 9 ? "1.5rem" : "2rem",
          }}
        >
          {display}
        </span>
        {pendingOp && !error && (
          <span className="block text-xs text-stone-400 mt-1">
            {tidy(acc ?? 0)} {pendingOp}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {keys.map((k, i) => (
          <button
            key={i}
            type="button"
            onClick={k.onClick}
            className={`${k.cls} ${k.span2 ? "col-span-2" : ""}`}
            style={{
              ...k.style,
              ...(k.active ? { outline: `2px solid ${theme.primary}`, outlineOffset: "-2px" } : {}),
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-stone-400">
        Calculadora de uso general para cuentas rápidas. También responde al
        teclado.
      </p>
    </div>
  );
}
