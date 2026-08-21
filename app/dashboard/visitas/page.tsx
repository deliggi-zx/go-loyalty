import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { todayLocalYmd } from "@/app/(public)/[slug]/vet-appointments-config";
import { VisitasManager, type VisitRow, type AvailabilityRow } from "./visitas-manager";

// Solo Domus, y solo role admin (hoy el único role que representa
// "agente" en esta org — ver [[domus-test-users]], agente-domus@gmail.com
// se creó con role admin). Mismo criterio de gate que dashboard/turnos/
// page.tsx (Huellitas, ALLOWED_ROLES admin/vet), adaptado: acá no hay un
// role 'vet' equivalente, así que la lista es de un solo elemento.
const ALLOWED_ROLES = ["admin"];

export default async function VisitasPage() {
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

  if (org?.slug !== "domus") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  const today = todayLocalYmd();

  // Agenda: SOLO las visitas de ESTE agente (no las de toda la org) — es
  // "su" agenda, ver punto 3 de la Fase 1. product/client se resuelven
  // aparte (mismo criterio de dos pasadas que dashboard/turnos/page.tsx
  // con pet/owner) en vez de un join, coherente con el resto del proyecto.
  // Fase turnos-rango (CAMBIO 3): trae pendientes Y confirmadas en la
  // misma query (nunca canceladas/rechazadas) — VisitasManager las separa
  // en dos secciones del lado del cliente.
  const [{ data: visitsData }, { data: availabilityData }] = await Promise.all([
    supabase
      .from("domus_property_visits")
      .select("id, product_id, client_profile_id, visit_date, visit_time, phone, status, visit_mode")
      .eq("org_id", orgId)
      .eq("agent_profile_id", user.id)
      .in("status", ["pending", "confirmed"])
      .gte("visit_date", today)
      .order("visit_date", { ascending: true })
      .order("visit_time", { ascending: true }),
    supabase
      .from("domus_agent_availability")
      .select("id, available_date, start_time, end_time")
      .eq("org_id", orgId)
      .eq("agent_profile_id", user.id)
      .gte("available_date", today)
      .order("available_date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const visits = visitsData ?? [];
  const productIds = Array.from(new Set(visits.map((v) => v.product_id)));
  const clientIds = Array.from(new Set(visits.map((v) => v.client_profile_id)));

  const [{ data: productsData }, { data: clientsData }] = await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    clientIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const productNameById = new Map((productsData ?? []).map((p) => [p.id, p.name]));
  const clientNameById = new Map((clientsData ?? []).map((c) => [c.id, c.full_name]));

  const visitRows: VisitRow[] = visits.map((v) => ({
    id: v.id,
    propertyName: productNameById.get(v.product_id) ?? "—",
    clientName: clientNameById.get(v.client_profile_id) ?? "—",
    phone: v.phone,
    date: v.visit_date,
    time: v.visit_time.slice(0, 5),
    status: v.status as "pending" | "confirmed",
    visitMode: v.visit_mode as "con_agente" | "retira_llave",
  }));

  const availabilityRows: AvailabilityRow[] = (availabilityData ?? []).map((a) => ({
    id: a.id,
    date: a.available_date,
    startTime: a.start_time.slice(0, 5),
    endTime: a.end_time.slice(0, 5),
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Visitas</h1>
          <p className="text-xs text-stone-400">Tu agenda de visitas y tu disponibilidad</p>
        </div>
      </header>

      <div className="p-8">
        <VisitasManager visits={visitRows} availability={availabilityRows} />
      </div>
    </div>
  );
}
