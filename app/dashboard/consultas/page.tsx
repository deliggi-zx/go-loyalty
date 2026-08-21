import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ConsultasManager, type InquiryRow } from "./consultas-manager";

// Solo Domus, y solo role admin — mismo criterio exacto que
// dashboard/visitas/page.tsx (ver comentario ahí sobre por qué la lista
// es de un solo elemento, sin equivalente a 'vet').
const ALLOWED_ROLES = ["admin"];

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

  if (org?.slug !== "domus") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

  // Todas las consultas de la org (no solo las de este agente, a
  // diferencia de la agenda de Visitas) — el cajón de Consultas es
  // compartido entre todos los agentes, cualquiera puede tomar una y
  // contactar al cliente. Sin filtro por status: nuevo/contactado/cerrado
  // conviven en la misma lista, ordenadas por más reciente primero — es
  // intencionalmente simple, sin tabs ni filtros todavía.
  const { data: inquiriesData } = await supabase
    .from("domus_general_inquiries")
    .select("id, client_profile_id, message, phone, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const inquiries = inquiriesData ?? [];
  const clientIds = Array.from(new Set(inquiries.map((i) => i.client_profile_id)));

  const { data: clientsData } =
    clientIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", clientIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const clientNameById = new Map((clientsData ?? []).map((c) => [c.id, c.full_name]));

  const rows: InquiryRow[] = inquiries.map((i) => ({
    id: i.id,
    clientName: clientNameById.get(i.client_profile_id) ?? "—",
    message: i.message,
    phone: i.phone,
    status: i.status as InquiryRow["status"],
    createdAt: i.created_at,
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
        <ConsultasManager inquiries={rows} />
      </div>
    </div>
  );
}
