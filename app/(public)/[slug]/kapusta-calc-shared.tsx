"use client";

import type { ReactNode } from "react";

// Piezas de UI compartidas por las 3 calculadoras de Kapusta
// (kapusta-calc-*.tsx). Viven en su propio archivo para que el contenedor
// (kapusta-calculadoras.tsx) y cada calc puedan importarlas sin ciclo de
// módulos. Estética alineada con el resto del sitio (ver
// general-inquiry-form.tsx / domus-property-filters.tsx): cards blancas,
// inputs stone-50, foco stone-400.

export const calcFieldClass =
  "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors";

export const calcLabelClass = "text-xs font-medium text-stone-600";

export interface KapustaTheme {
  primary: string;
  secondary: string;
  accent: string;
}

export function CalcField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className={calcLabelClass}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}

export function CalcButton({
  theme,
  disabled,
  onClick,
  children,
}: {
  theme: KapustaTheme;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      style={{ backgroundColor: theme.primary }}
    >
      {children}
    </button>
  );
}

// Fila de resultado destacado (etiqueta + valor grande).
export function CalcResultRow({
  label,
  value,
  emphasis,
  theme,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  theme: KapustaTheme;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-stone-500">{label}</span>
      <span
        className={emphasis ? "text-lg font-bold" : "text-sm font-semibold text-stone-800"}
        style={emphasis ? { color: theme.primary } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export function CalcNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed text-stone-400">{children}</p>
  );
}

export function CalcError({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
      {children}
    </div>
  );
}
