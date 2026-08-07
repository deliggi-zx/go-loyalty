import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ProfesoresManager, type MemberRow, type ScheduleRow } from "./profesores-manager";

const DAY_LABELS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function shortLabel(profileId: string) {
  return `Socio ${profileId.slice(0, 8)}`;
}

export default async function ProfesoresPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  const customers: MemberRow[] = [];
  const profesores: MemberRow[] = [];
  let schedule: ScheduleRow[] = [];

  if (orgId) {
    const { data: members } = await supabase
      .from("loyalty_members")
      .select("profile_id, role")
      .eq("org_id", orgId)
      .in("role", ["customer", "profesor"]);

    const profileIds = (members ?? []).map((m) => m.profile_id);
    const { data: profiles } =
      profileIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
        : { data: [] };

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    for (const m of members ?? []) {
      const row: MemberRow = {
        profileId: m.profile_id,
        name: nameById.get(m.profile_id) || shortLabel(m.profile_id),
      };
      if (m.role === "profesor") profesores.push(row);
      else customers.push(row);
    }

    const { data: scheduleData } = await supabase
      .from("gym_class_schedule")
      .select(
        "id, day_of_week, start_time, end_time, instructor_id, gym_classes(name), gym_locations(name)"
      )
      .eq("org_id", orgId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    schedule = (scheduleData ?? []).map((s) => {
      const cls = Array.isArray(s.gym_classes) ? s.gym_classes[0] : s.gym_classes;
      const loc = Array.isArray(s.gym_locations) ? s.gym_locations[0] : s.gym_locations;
      return {
        id: s.id,
        className: cls?.name ?? "Clase",
        locationName: loc?.name ?? "",
        dayLabel: DAY_LABELS[s.day_of_week] ?? "",
        timeLabel: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
        instructorId: s.instructor_id,
      };
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Profesores</h1>
          <p className="text-xs text-stone-400">
            Ascendé socios a profesor y asignalos a horarios específicos
          </p>
        </div>
      </header>

      <div className="p-8">
        <ProfesoresManager customers={customers} profesores={profesores} schedule={schedule} />
      </div>
    </div>
  );
}
