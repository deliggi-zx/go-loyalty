interface PointsPanelProps {
  orgName: string;
  balance: number;
  primaryColor: string;
}

export function PointsPanel({ orgName, balance, primaryColor }: PointsPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-1">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
        Socio {orgName}
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
