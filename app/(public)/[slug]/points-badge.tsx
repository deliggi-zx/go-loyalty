interface PointsBadgeProps {
  tierLabel: string;
  balance: number;
}

export function PointsBadge({ tierLabel, balance }: PointsBadgeProps) {
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
