import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { OfertasReservasTabs } from "./ofertas-reservas-tabs";
import type { OfferRow } from "@/app/dashboard/ofertas/ofertas-manager";
import type { ReservationRow } from "@/app/dashboard/reservas/reservas-manager";

// Fase reorganizar panel: mismo gate que el resto de /dashboard/inicio/*
// — admin (gerente) o agente, ver [[domus-test-users]] Fase 1c.
const ALLOWED_ROLES = ["admin", "agente"];

// Destino nuevo del botón "Ofertas/Reservas" del panel — junta las
// mismas dos queries que ya viven en /dashboard/ofertas y
// /dashboard/reservas (sin tocar esas páginas ni sus actions.ts, siguen
// existiendo tal cual para quien entre por el sidebar de escritorio) y
// las pasa a OfertasReservasTabs.
export default async function InicioOfertasReservasPage() {
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

  const [{ data: offersData }, { data: reservationsData }] = await Promise.all([
    supabase
      .from("domus_property_offers")
      .select(
        "id, owner_profile_id, phone, operation_type, property_type, address, neighborhood, requested_price, currency, rooms, total_surface, covered_surface, amenities, status, created_at, scheduled_at"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("domus_property_reservations")
      .select("id, product_id, client_profile_id, phone, created_at")
      .eq("org_id", orgId)
      .eq("status", "pendiente_confirmacion")
      .order("created_at", { ascending: false }),
  ]);

  const offers = offersData ?? [];
  const reservations = reservationsData ?? [];

  const offerIds = offers.map((o) => o.id);
  const ownerIds = Array.from(new Set(offers.map((o) => o.owner_profile_id)));
  const reservationProductIds = Array.from(new Set(reservations.map((r) => r.product_id)));
  const reservationClientIds = Array.from(new Set(reservations.map((r) => r.client_profile_id)));

  const [{ data: photosData }, { data: ownersData }, { data: reservationProductsData }, { data: reservationClientsData }] =
    await Promise.all([
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
      reservationProductIds.length > 0
        ? supabase.from("products").select("id, name").in("id", reservationProductIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      reservationClientIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", reservationClientIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);

  const photosByOffer = new Map<string, string[]>();
  for (const p of photosData ?? []) {
    const list = photosByOffer.get(p.offer_id) ?? [];
    list.push(p.image_url);
    photosByOffer.set(p.offer_id, list);
  }

  const ownerNameById = new Map((ownersData ?? []).map((o) => [o.id, o.full_name]));
  const reservationProductNameById = new Map((reservationProductsData ?? []).map((p) => [p.id, p.name]));
  const reservationClientNameById = new Map((reservationClientsData ?? []).map((c) => [c.id, c.full_name]));

  const offerRows: OfferRow[] = offers.map((o) => ({
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

  const reservationRows: ReservationRow[] = reservations.map((r) => ({
    id: r.id,
    clientName: reservationClientNameById.get(r.client_profile_id) ?? "—",
    phone: r.phone,
    propertyName: reservationProductNameById.get(r.product_id) ?? "—",
    createdAt: r.created_at,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/inicio" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          ‹ Inicio
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Ofertas/Reservas</h1>
      </header>

      <div className="p-8">
        <OfertasReservasTabs offers={offerRows} reservations={reservationRows} />
      </div>
    </div>
  );
}
