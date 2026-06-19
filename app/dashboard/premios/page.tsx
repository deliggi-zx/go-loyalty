import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { RewardsGrid, type RewardRow } from "@/components/dashboard/rewards-grid";

export default async function PremiosPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  let rewards: RewardRow[] = [];

  if (orgId) {
    const { data } = await supabase
      .from("loyalty_rewards")
      .select("id, name, description, is_active, stamps_required, emoji")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    rewards = (data ?? []).map((r) => ({
      id: r.id,
      emoji: r.emoji ?? "🎁",
      name: r.name,
      description: r.description ?? "",
      stampsRequired: r.stamps_required ?? 10,
      totalRedemptions: 0,
      monthRedemptions: 0,
      active: r.is_active ?? true,
    }));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Premios</h1>
          <p className="text-xs text-stone-400">
            Configurá los premios de tu programa de fidelización
          </p>
        </div>
        <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo premio
        </button>
      </header>

      <div className="p-8">
        <RewardsGrid rewards={rewards} />
      </div>
    </div>
  );
}
