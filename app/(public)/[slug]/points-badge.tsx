interface PointsBadgeProps {
  tierLabel: string;
  balance: number;
  // Estilo oscuro + acentos #ff6b00 — hoy solo "bike" (Fase P4), mismo
  // mecanismo de prop-por-slug que ya usan login-form.tsx/side-menu.tsx.
  // Acá además sube la jerarquía: el número pasa a ser lo más grande y
  // vistoso del badge (antes tierLabel y balance eran del mismo tamaño).
  bikeTheme?: boolean;
}

export function PointsBadge({ tierLabel, balance, bikeTheme = false }: PointsBadgeProps) {
  if (bikeTheme) {
    return (
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="bg-[#0a0a0b] border border-[#ff6b00]/40 rounded-2xl px-4 py-3 text-center shadow-[0_0_16px_rgba(255,107,0,0.2)]">
          <p className="text-[11px] font-medium text-[#9b9995] uppercase tracking-wide">
            {tierLabel}
          </p>
          <p className="text-4xl font-bold tabular-nums text-[#ff6b00] drop-shadow-[0_0_10px_rgba(255,107,0,0.55)]">
            {balance.toLocaleString("es-AR")}{" "}
            <span className="text-lg font-semibold align-middle">pts</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="max-w-lg mx-auto px-4 py-2 text-center text-xs font-medium text-stone-500">
      {tierLabel}
      <span className="mx-1.5 text-stone-300">·</span>
      <span className="font-semibold text-stone-800">
        {balance.toLocaleString("es-AR")} pts
      </span>
    </p>
  );
}
