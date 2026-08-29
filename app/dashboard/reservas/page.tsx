import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ReservasManager, type ReservationRow } from "./reservas-manager";

// Mismo criterio de gate exacto que dashboard/visitas, /consultas y
// /ofertas — slug domus + role admin.
const ALLOWED_ROLES = ["admin"];

// Fase Reservas (Domus): panel del agente para resolver reservas
// pendientes — mismo criterio que OfertasPage (org-wide, no atado a un
// agente puntual). Solo lista status='pendiente_confirmacion': una vez
// confirmada o rechazada ya no pertenece acá (ver ReservasManager).
export default async function ReservasPage() {
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

  const { data: reservationsData } = await supabase
    .from("domus_property_reservations")
    .select("id, product_id, client_profile_id, phone, created_at")
    .eq("org_id", orgId)
    .eq("status", "pendiente_confirmacion")
    .order("created_at", { ascending: false });

  const reservations = reservationsData ?? [];
  const productIds = Array.from(new Set(reservations.map((r) => r.product_id)));
  const clientIds = Array.from(new Set(reservations.map((r) => r.client_profile_id)));

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

  const rows: ReservationRow[] = reservations.map((r) => ({
    id: r.id,
    clientName: clientNameById.get(r.client_profile_id) ?? "—",
    phone: r.phone,
    propertyName: productNameById.get(r.product_id) ?? "—",
    createdAt: r.created_at,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Reservas</h1>
          <p className="text-xs text-stone-400">Reservas pendientes de confirmar</p>
        </div>
      </header>

      <div className="p-8">
        <ReservasManager reservations={rows} />
      </div>
    </div>
  );
}
