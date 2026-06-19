"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ToggleLeft, ToggleRight, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleRewardActive } from "@/app/dashboard/premios/actions";

export interface RewardRow {
  id: string;
  emoji: string;
  name: string;
  description: string;
  stampsRequired: number;
  totalRedemptions: number;
  monthRedemptions: number;
  active: boolean;
}

export function RewardsGrid({ rewards: initialRewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rewards, setRewards] = useState(initialRewards);
  const [filter, setFilter] = useState<"todos" | "activos" | "inactivos">("todos");

  // Sync state when server re-renders with fresh data
  useEffect(() => {
    setRewards(initialRewards);
  }, [initialRewards]);

  function handleToggle(id: string, currentActive: boolean) {
    // Optimistic update
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    startTransition(async () => {
      await toggleRewardActive(id, !currentActive);
      router.refresh();
    });
  }

  const filtered = rewards.filter((r) => {
    if (filter === "activos") return r.active;
    if (filter === "inactivos") return !r.active;
    return true;
  });

  const activeCount   = rewards.filter((r) => r.active).length;
  const inactiveCount = rewards.filter((r) => !r.active).length;
  const totalMonth    = rewards.reduce((acc, r) => acc + r.monthRedemptions, 0);
  const totalAll      = rewards.reduce((acc, r) => acc + r.totalRedemptions, 0);

  if (rewards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400">
        <p className="text-sm">No hay premios configurados aún.</p>
        <p className="text-xs mt-1">Usá el botón &quot;Nuevo premio&quot; para empezar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Premios activos",    value: activeCount,                    sub: `${inactiveCount} inactivos`,  color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "Canjes este mes",    value: totalMonth,                     sub: "en todos los premios",         color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Canjes totales",     value: totalAll,                       sub: "desde el inicio",              color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "Premio más canjeado", value: rewards[0]?.name ?? "—",       sub: `${rewards[0]?.totalRedemptions ?? 0} canjes totales`, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 space-y-1">
            <p className="text-xs font-medium text-stone-500">{label}</p>
            <p className={cn("text-2xl font-bold truncate", color)}>{value}</p>
            <p className="text-xs text-stone-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["todos", "activos", "inactivos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-amber-100 text-amber-700"
                : "text-stone-500 hover:bg-stone-100"
            )}
          >
            {f === "todos"
              ? `Todos (${rewards.length})`
              : f === "activos"
              ? `Activos (${activeCount})`
              : `Inactivos (${inactiveCount})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((reward) => (
          <div
            key={reward.id}
            className={cn(
              "bg-white rounded-xl border p-5 space-y-4 transition-all",
              reward.active ? "border-stone-200" : "border-stone-100 opacity-60"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                    reward.active ? "bg-amber-50" : "bg-stone-50"
                  )}
                >
                  {reward.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 text-sm">{reward.name}</h3>
                  <p className="text-xs text-stone-400 mt-0.5 leading-snug max-w-[160px]">
                    {reward.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(reward.id, reward.active)}
                disabled={isPending}
                className="shrink-0 text-stone-400 hover:text-amber-500 transition-colors p-1 -mr-1 disabled:opacity-50"
                title={reward.active ? "Desactivar" : "Activar"}
              >
                {reward.active ? (
                  <ToggleRight className="w-6 h-6 text-amber-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                <Award className="w-3 h-3" />
                {reward.stampsRequired} sellos
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  reward.active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-stone-100 text-stone-400"
                )}
              >
                {reward.active ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-100">
              <div>
                <p className="text-xs text-stone-400">Este mes</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-sm font-semibold text-stone-800">
                    {reward.monthRedemptions}
                  </span>
                  <span className="text-xs text-stone-400">canjes</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-400">Total histórico</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-semibold text-stone-800">
                    {reward.totalRedemptions}
                  </span>
                  <span className="text-xs text-stone-400">canjes</span>
                </div>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-700 hover:bg-stone-50 py-2 rounded-lg transition-colors border border-stone-100 hover:border-stone-200">
              <Pencil className="w-3.5 h-3.5" />
              Editar premio
            </button>
          </div>
        ))}

        <button className="rounded-xl border-2 border-dashed border-stone-200 p-5 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50 transition-all min-h-[220px]">
          <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
            <span className="text-xl font-light leading-none">+</span>
          </div>
          <span className="text-sm font-medium">Nuevo premio</span>
        </button>
      </div>
    </div>
  );
}
