import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ConsultasManager, type InquiryRow, type AgentOption } from "./consultas-manager";

// Solo Domus — role admin (gerente) o agente, ver Fase 1c (rol agente):
// antes solo admin, ahora el gerente sigue viendo TODO y cada agente ve
// solo lo suyo (filtro de visibilidad más abajo).
const ALLOWED_ROLES = ["admin", "agente"];

export default async function ConsultasPage() {
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

  if (org?.slug !== "domus" && org?.slug !== "kapusta") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  const isManager = membership.role === "admin";

  // Fase 1c (rol agente): el gerente sigue viendo TODAS las consultas de
  // la org (comportamiento de siempre, sin filtrar). Un agente ve solo
  // las sin asignar + las asignadas a él — nunca las de otro agente. Sin
  // filtro por status: nuevo/contactado/cerrado conviven en la misma
  // lista, ordenadas por más reciente primero — sigue siendo
  // intencionalmente simple, sin tabs.
  let inquiriesQuery = supabase
    .from("domus_general_inquiries")
    .select("id, client_profile_id, message, phone, status, topic, created_at, assigned_agent_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (!isManager) {
    inquiriesQuery = inquiriesQuery.or(`assigned_agent_id.is.null,assigned_agent_id.eq.${user.id}`);
  }

  const [{ data: inquiriesData }, { data: agentsData }] = await Promise.all([
    inquiriesQuery,
    // Lista de agentes para el selector "Asignar a..." del gerente — solo
    // hace falta pedirla si es manager, pero pedirla siempre es más
    // simple y barato (org chica) que condicionar el Promise.all entero.
    supabase
      .from("loyalty_members")
      .select("profile_id")
      .eq("org_id", orgId)
      .eq("role", "agente"),
  ]);

  const inquiries = inquiriesData ?? [];
  const clientIds = Array.from(new Set(inquiries.map((i) => i.client_profile_id)));
  const agentProfileIds = (agentsData ?? []).map((a) => a.profile_id);
  const assignedAgentIds = Array.from(
    new Set(inquiries.map((i) => i.assigned_agent_id).filter((id): id is string => !!id))
  );
  const profileIds = Array.from(new Set([...clientIds, ...agentProfileIds, ...assignedAgentIds]));

  const { data: profilesData } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]));

  const rows: InquiryRow[] = inquiries.map((i) => ({
    id: i.id,
    clientName: nameById.get(i.client_profile_id) ?? "—",
    message: i.message,
    phone: i.phone,
    status: i.status as InquiryRow["status"],
    topic: i.topic as InquiryRow["topic"],
    createdAt: i.created_at,
    assignedAgentId: i.assigned_agent_id,
    assignedAgentName: i.assigned_agent_id ? nameById.get(i.assigned_agent_id) ?? "—" : null,
  }));

  const agents: AgentOption[] = agentProfileIds.map((id) => ({
    id,
    name: nameById.get(id) ?? "—",
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Consultas</h1>
          <p className="text-xs text-stone-400">
            Clientes que buscan algo puntual, sin propiedad elegida todavía
          </p>
        </div>
      </header>

      <div className="p-8">
        <ConsultasManager
          inquiries={rows}
          isManager={isManager}
          currentUserId={user.id}
          agents={agents}
        />
      </div>
    </div>
  );
}
