"use client";

import { useState } from "react";
import { Calculator, Home, TrendingUp } from "lucide-react";
import type { KapustaTheme } from "./kapusta-calc-shared";
import { KapustaCalcCredito } from "./kapusta-calc-credito";
import { KapustaCalcTasacion } from "./kapusta-calc-tasacion";
import { KapustaCalcAlquiler } from "./kapusta-calc-alquiler";

interface KapustaCalculadorasProps {
  tipos: string[];
  zonas: string[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
}

type TabId = "credito" | "tasacion" | "alquiler";

const TABS: { id: TabId; label: string; icon: typeof Calculator }[] = [
  { id: "credito", label: "Crédito hipotecario", icon: Calculator },
  { id: "tasacion", label: "Precio por m²", icon: Home },
  { id: "alquiler", label: "Ajuste de alquiler", icon: TrendingUp },
];

// Selector de calculadora + la calc activa. Extraído del contenedor de
// página para poder reusarlo tal cual dentro del modal del botón flotante
// (kapusta-calc-modal.tsx) sin duplicar la lógica de las 3 calculadoras.
export function KapustaCalcTabs({
  tipos,
  zonas,
  primaryColor,
  secondaryColor,
  accentColor,
}: Omit<KapustaCalculadorasProps, "backgroundColor">) {
  const [active, setActive] = useState<TabId>("credito");

  const theme: KapustaTheme = {
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor,
  };

  return (
    <div className="space-y-4">
      {/* Selector de calculadora — fila scrolleable en mobile */}
      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Calculadoras">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors"
              style={
                isActive
                  ? { backgroundColor: primaryColor, borderColor: primaryColor, color: "#fff" }
                  : { borderColor: "#d6d3d1", color: "#57534e", backgroundColor: "#fff" }
              }
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        {active === "credito" && <KapustaCalcCredito theme={theme} />}
        {active === "tasacion" && (
          <KapustaCalcTasacion theme={theme} tipos={tipos} zonas={zonas} />
        )}
        {active === "alquiler" && <KapustaCalcAlquiler theme={theme} />}
      </div>
    </div>
  );
}

export function KapustaCalculadoras({
  tipos,
  zonas,
  primaryColor,
  secondaryColor,
  accentColor,
}: KapustaCalculadorasProps) {
  return (
    <div className="mt-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
          Calculadoras
        </h1>
        <p className="text-sm text-stone-600">
          Herramientas para estimar una cuota, un valor de referencia o la
          actualización de un alquiler. Todos los resultados son estimativos.
        </p>
      </header>

      <KapustaCalcTabs
        tipos={tipos}
        zonas={zonas}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
      />
    </div>
  );
}
