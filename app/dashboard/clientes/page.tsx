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

      // 2. Perfiles (nombre) — public.profiles NO tiene columna "email"
      // (solo id, full_name, avatar_url, created_at; confirmado con
      // information_schema). El mail vive en auth.users, y el server
      // client de la app usa la anon key (ver lib/supabase/server.ts),
      // sin acceso a ese schema — no hay forma de traerlo acá sin sumar
      // infra nueva (service role). Mismo diagnóstico y misma solución
      // que ya se tomó en dashboard/mascotas/page.tsx para este mismo
      // bug: se saca "email" del todo en vez de agregar una consulta
      // aparte para un dato que el resto del código ya decidió no
      // mostrar.
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds);

      // 3. Puntos acumulados por cliente en esta org — la columna real es
      // "balance", no "points" (ver lib/loyalty/transactions.ts y
      // [slug]/data.ts, que ya la usan bien). "updated_at" tampoco existe
      // en esta tabla (confirmado con information_schema: id, profile_id,
      // org_id, balance, total_earned, app — nada de timestamps) — se
      // saca del select, mismo motivo que el bug de "points": una
      // columna inválida tira abajo el select entero en silencio.
      const { data: pointsData } = await supabase
        .from("loyalty_user_points")
        .select("profile_id, balance")
        .eq("org_id", orgId)
        .in("profile_id", profileIds);

      // Fase fidelización: ingresos registrados (loyalty_visits). Se traen
      // todos los del org+clientes y se agregan en JS — última visita y
      // conteo del mes en curso. Hoy solo tiene filas para Kapusta; para
      // el resto de las orgs queda todo en 0 / fecha de alta como antes.
      const { data: visitData } = await supabase
        .from("loyalty_visits")
        .select("profile_id, visited_at")
        .eq("org_id", orgId)
        .in("profile_id", profileIds);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const visitsByProfile = new Map<string, { last: string; month: number }>();
      for (const v of visitData ?? []) {
        const cur = visitsByProfile.get(v.profile_id) ?? { last: "", month: 0 };
        if (!cur.last || v.visited_at > cur.last) cur.last = v.visited_at;
        if (new Date(v.visited_at) >= startOfMonth) cur.month += 1;
        visitsByProfile.set(v.profile_id, cur);
      }

      customers = members.map((m) => {
        const profile = profiles?.find((p) => p.id === m.profile_id);
        const pts = pointsData?.find((p) => p.profile_id === m.profile_id);
        const visitAgg = visitsByProfile.get(m.profile_id);

        return {
          id: m.profile_id,
          name: profile?.full_name ?? "Cliente sin nombre",
          contact: "",
          points: pts?.balance ?? 0,
          visitsThisMonth: visitAgg?.month ?? 0,
          // Última visita real si hay registro; si no, la fecha de alta
          // como aproximación (comportamiento previo).
          lastVisit: visitAgg?.last || m.created_at || "",
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
