import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";
import { TallerManager, type AvailabilityRow, type WorkshopAppointmentRow } from "./taller-manager";

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

  // Fase T3: turnos pending+confirmed desde hoy — mismo criterio que
  // domus_property_visits en dashboard/visitas/page.tsx (nunca
  // rejected/cancelled acá, esos ya están cerrados). Cliente se resuelve
  // aparte con profiles.select, mismo patrón de "dos pasadas" que product/
  // client en Visitas (Domus) en vez de un join.
  const { data: appointmentsData } = await supabase
    .from("bike_workshop_appointments")
    .select("id, profile_id, date, start_time, description, status")
    .eq("org_id", orgId)
    .in("status", ["pending", "confirmed"])
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const appointments = appointmentsData ?? [];
  const clientIds = Array.from(new Set(appointments.map((a) => a.profile_id)));
  const { data: clientsData } =
    clientIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", clientIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const clientNameById = new Map((clientsData ?? []).map((c) => [c.id, c.full_name]));

  const appointmentRows: WorkshopAppointmentRow[] = appointments.map((a) => ({
    id: a.id,
    clientName: clientNameById.get(a.profile_id) ?? "—",
    date: a.date,
    time: a.start_time.slice(0, 5),
    description: a.description ?? "",
    status: a.status as "pending" | "confirmed",
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
        <TallerManager availability={availabilityRows} appointments={appointmentRows} />
      </div>
    </div>
  );
}
