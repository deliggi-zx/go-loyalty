import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { CustomersTable, type Customer } from "@/components/dashboard/customers-table";

export default async function ClientesPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  let customers: Customer[] = [];

  if (orgId) {
    // 1. Miembros con role='customer' en esta organización
    const { data: members } = await supabase
      .from("loyalty_members")
      .select("profile_id, created_at")
      .eq("org_id", orgId)
      .eq("role", "customer");

    if (members && members.length > 0) {
      const profileIds = members.map((m) => m.profile_id);

      // 2. Perfiles (nombre y email)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", profileIds);

      // 3. Puntos acumulados por cliente en esta org
      const { data: pointsData } = await supabase
        .from("loyalty_user_points")
        .select("profile_id, points, updated_at")
        .eq("org_id", orgId)
        .in("profile_id", profileIds);

      customers = members.map((m) => {
        const profile = profiles?.find((p) => p.id === m.profile_id);
        const pts = pointsData?.find((p) => p.profile_id === m.profile_id);

        return {
          id: m.profile_id,
          name: profile?.full_name ?? profile?.email ?? m.profile_id,
          contact: profile?.email ?? "",
          stamps: pts?.points ?? 0,
          totalVisits: 0,
          lastVisit: pts?.updated_at ?? m.created_at ?? "",
          status: "activo" as const,
        };
      });
    }
  }

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
        <CustomersTable customers={customers} />
      </div>
    </div>
  );
}
