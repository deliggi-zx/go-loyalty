import { Plus } from "lucide-react";
import { RewardsGrid } from "@/components/dashboard/rewards-grid";

export default function PremiosPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Premios</h1>
          <p className="text-xs text-stone-400">Configurá los premios de tu programa de fidelización</p>
        </div>
        <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo premio
        </button>
      </header>

      <div className="p-8">
        <RewardsGrid />
      </div>
    </div>
  );
}
