import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { OfertasManager, type OfferRow } from "./ofertas-manager";

// Mismo criterio de gate exacto que dashboard/consultas y
// dashboard/visitas — slug domus + role admin.
const ALLOWED_ROLES = ["admin"];

export default async function OfertasPage() {
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

  // Todas las ofertas de la org (mismo criterio que Consultas: no está
  // atado a un agente puntual, cualquiera puede tomarla y contactar al
  // dueño) — sin filtro por status, ordenadas por más reciente primero.
  const { data: offersData } = await supabase
    .from("domus_property_offers")
    .select(
      "id, owner_profile_id, phone, operation_type, property_type, address, neighborhood, requested_price, currency, rooms, total_surface, covered_surface, amenities, status, created_at, scheduled_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const offers = offersData ?? [];
  const offerIds = offers.map((o) => o.id);
  const ownerIds = Array.from(new Set(offers.map((o) => o.owner_profile_id)));

  const [{ data: photosData }, { data: ownersData }] = await Promise.all([
    offerIds.length > 0
      ? supabase
          .from("domus_property_offer_photos")
          .select("offer_id, image_url, display_order")
          .in("offer_id", offerIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as { offer_id: string; image_url: string; display_order: number }[] }),
    ownerIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const photosByOffer = new Map<string, string[]>();
  for (const p of photosData ?? []) {
    const list = photosByOffer.get(p.offer_id) ?? [];
    list.push(p.image_url);
    photosByOffer.set(p.offer_id, list);
  }

  const ownerNameById = new Map((ownersData ?? []).map((o) => [o.id, o.full_name]));

  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    ownerName: ownerNameById.get(o.owner_profile_id) ?? "—",
    phone: o.phone,
    operationType: o.operation_type as OfferRow["operationType"],
    propertyType: o.property_type,
    address: o.address,
    neighborhood: o.neighborhood,
    requestedPrice: o.requested_price,
    currency: o.currency,
    rooms: o.rooms,
    totalSurface: o.total_surface,
    coveredSurface: o.covered_surface,
    amenities: o.amenities,
    status: o.status as OfferRow["status"],
    createdAt: o.created_at,
    photoUrls: photosByOffer.get(o.id) ?? [],
    scheduledAt: o.scheduled_at,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Ofertas</h1>
          <p className="text-xs text-stone-400">
            Propiedades que dueños ofrecieron desde su perfil, pendientes de revisión
          </p>
        </div>
      </header>

      <div className="p-8">
        <OfertasManager offers={rows} />
      </div>
    </div>
  );
}
