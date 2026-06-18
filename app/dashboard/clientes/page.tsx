import { UserPlus } from "lucide-react";
import { CustomersTable } from "@/components/dashboard/customers-table";

export default function ClientesPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Clientes</h1>
          <p className="text-xs text-stone-400">Gestioná tu base de clientes</p>
        </div>
        <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <UserPlus className="w-4 h-4" />
          Nuevo cliente
        </button>
      </header>

      <div className="p-8">
        <CustomersTable />
      </div>
    </div>
  );
}
