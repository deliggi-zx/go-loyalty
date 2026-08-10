import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { CanchasManager, type CourtRow } from "./canchas-manager";

export default async function CanchasPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  let courts: CourtRow[] = [];
  if (orgId) {
    const { data } = await supabase
      .from("gym_courts")
      .select("id, name, court_type, photo_url")
      .eq("org_id", orgId)
      .order("name", { ascending: true });
    courts = data ?? [];
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Canchas</h1>
          <p className="text-xs text-stone-400">
            Cargá y editá las canchas de fútbol 5/7/11 de tu predio
          </p>
        </div>
      </header>

      <div className="p-8">
        <CanchasManager orgId={orgId ?? ""} courts={courts} />
      </div>
    </div>
  );
}
