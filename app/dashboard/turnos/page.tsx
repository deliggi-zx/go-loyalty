import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";
import { TurnosManager, type AppointmentRow } from "./turnos-manager";

// Visible solo para role admin o vet dentro de la org (Huellitas) — mismo
// criterio exacto que mascotas/page.tsx (ver ALLOWED_ROLES ahí): el ítem
// del sidebar ya lo oculta (ver showTurnos en dashboard/layout.tsx), pero
// eso es solo la navegación, acá es el control de acceso real.
const ALLOWED_ROLES = ["admin", "vet"];

export default async function TurnosPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    redirect("/dashboard");
  }

  // "Próximos" (punto 4, pedido explícito): confirmados, desde hoy en
  // adelante — un turno cancelado o de una fecha ya pasada no es
  // "próximo" para nadie que abra este panel. todayLocalYmd() en vez de
  // una fecha calculada acá aparte, para no tener dos criterios de "hoy"
  // (local vs. UTC) conviviendo entre esta pantalla y el wizard del dueño.
  const { data: appointmentsData } = await supabase
    .from("vet_appointments")
    .select("id, owner_profile_id, pet_id, pet_name_hint, reason, appointment_date, appointment_time")
    .eq("org_id", orgId)
    .eq("status", "confirmed")
    .gte("appointment_date", todayLocalYmd())
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  const appointments = appointmentsData ?? [];

  const petIds = Array.from(
    new Set(appointments.map((a) => a.pet_id).filter((id): id is string => !!id))
  );
  const ownerIds = Array.from(new Set(appointments.map((a) => a.owner_profile_id)));

  const [{ data: petsData }, { data: ownersData }] = await Promise.all([
    petIds.length > 0
      ? supabase.from("vet_pets").select("id, name").in("id", petIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const petNameById = new Map((petsData ?? []).map((p) => [p.id, p.name]));
  const ownerNameById = new Map((ownersData ?? []).map((o) => [o.id, o.full_name]));

  const rows: AppointmentRow[] = appointments.map((a) => ({
    id: a.id,
    // pet_id no nulo pero sin match en petNameById (mascota borrada
    // después de agendar, por ejemplo) cae al mismo "—" que cualquier
    // otro dato faltante, en vez de mostrar un id crudo.
    petName: a.pet_id ? petNameById.get(a.pet_id) ?? "—" : a.pet_name_hint ?? "—",
    ownerName: ownerNameById.get(a.owner_profile_id) ?? "—",
    reason: a.reason,
    date: a.appointment_date,
    // Postgres devuelve "HH:MM:SS" — se recorta acá, no en el cliente,
    // mismo criterio que getAvailableSlots (vet-appointments-data.ts).
    time: a.appointment_time.slice(0, 5),
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Turnos</h1>
          <p className="text-xs text-stone-400">Turnos próximos, ordenados por fecha y horario</p>
        </div>
      </header>

      <div className="p-8">
        <TurnosManager appointments={rows} />
      </div>
    </div>
  );
}
