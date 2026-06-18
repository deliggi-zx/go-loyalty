import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  change,
  positive = true,
  icon: Icon,
  iconColor = "text-amber-600",
  iconBg = "bg-amber-50",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className={cn("text-xs mt-0.5", positive ? "text-emerald-600" : "text-red-500")}>
          {change} vs. mes anterior
        </p>
      </div>
    </div>
  );
}
