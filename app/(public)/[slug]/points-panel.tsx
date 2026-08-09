interface PointsPanelProps {
  label: string;
  balance: number;
  primaryColor: string;
  // Estilo oscuro + acentos #ff6b00 — hoy solo "bike" (Fase P4), mismo
  // mecanismo de prop-por-slug que login-form.tsx/points-badge.tsx.
  bikeTheme?: boolean;
}

export function PointsPanel({ label, balance, primaryColor, bikeTheme = false }: PointsPanelProps) {
  if (bikeTheme) {
    return (
      <div className="bg-[#0a0a0b] rounded-2xl shadow-sm border border-[#26262a] p-6 text-center space-y-1">
        <p className="text-xs font-medium text-[#9b9995] uppercase tracking-wide">
          {label}
        </p>
        <p className="text-5xl font-bold tabular-nums text-[#ff6b00] drop-shadow-[0_0_12px_rgba(255,107,0,0.55)]">
          {balance.toLocaleString("es-AR")}
        </p>
        <p className="text-xs text-[#6b6965]">puntos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-1">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
        {label}
      </p>
      <p
        className="text-4xl font-bold tabular-nums"
        style={{ color: primaryColor || "#f59e0b" }}
      >
        {balance.toLocaleString("es-AR")}
      </p>
      <p className="text-xs text-stone-400">puntos disponibles</p>
    </div>
  );
}
