import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";
import { TallerManager, type AvailabilityRow } from "./taller-manager";

// Solo bike, y solo role admin — mismo criterio de gate que
// dashboard/visitas/page.tsx (Domus, ALLOWED_ROLES admin) y el
// isBikeAdmin ya usado en /perfil (Fase P5) y layout.tsx (Fase 3j).
const ALLOWED_ROLES = ["admin"];

export default async function TallerPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: org }, { data: membership }] = await Promise.all([
    supabase.from("loyalty_organizations").select("slug").eq("id", orgId).maybeSingle(),
    supabase
      .from("loyalty_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (org?.slug !== "bike") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  const today = todayLocalYmd();

  const { data: availabilityData } = await supabase
    .from("bike_workshop_availability")
    .select("id, date, start_time, end_time")
    .eq("org_id", orgId)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const availabilityRows: AvailabilityRow[] = (availabilityData ?? []).map((a) => ({
    id: a.id,
    date: a.date,
    startTime: a.start_time.slice(0, 5),
    endTime: a.end_time.slice(0, 5),
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Taller</h1>
          <p className="text-xs text-stone-400">Disponibilidad de service y reparación</p>
        </div>
      </header>

      <div className="p-8">
        <TallerManager availability={availabilityRows} />
      </div>
    </div>
  );
}
