import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd, localYmd } from "@/app/(public)/[slug]/vet-appointments-config";

// Fase Resumen matutino (Domus): "más de X días sin novedades" — mismo
// valor que se usa tanto para armar el contexto acá como para decidir si
// hay algo que valga la pena resumir (ver getMorningSummary). Un cliente
// en seguimiento con menos de esto no es "estancado" todavía, no entra
// en el resumen.
export const SEGUIMIENTO_STALE_DAYS = 3;

export interface MorningSummaryContext {
  // Consultas 'nuevo' — mensaje corto (recortado, no todo el texto si es
  // muy largo) para no inflar el prompt de más.
  newInquiries: { message: string }[];
  // Fase resumen ampliado: las de kind "visita" ahora traen propertyName
  // (antes solo tenían clientName+time, sin la propiedad — ver Gate 0).
  meetingsToday: { clientName: string; time: string; kind: "reunion" | "visita"; propertyName?: string }[];
  staleFollowUps: { clientName: string; daysSince: number }[];
  // Fase resumen ampliado: reservas domus_property_reservations en
  // 'pendiente_confirmacion' — mismo status que lee /dashboard/reservas,
  // ninguna tabla nueva. hoursWaiting en vez de days: a diferencia de
  // staleFollowUps (que recién importa pasados varios días), una reserva
  // pendiente es urgente desde el primer día, tiene más sentido en horas.
  pendingReservations: { propertyName: string; hoursWaiting: number }[];
}

const MESSAGE_PREVIEW_LENGTH = 160;

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)));
}

function hoursSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
}

// Junta lo mismo que ya arman domus-badge-counts.ts (consultas nuevas,
// reuniones/visitas de hoy) más "clientes en seguimiento estancados"
// (seguimiento/contactado sin novedades hace más de SEGUIMIENTO_STALE_
// DAYS) — mismas tablas y criterios de status que /dashboard/inicio/
// {consultas,reuniones,seguimiento}, ninguna tabla nueva.
export async function getMorningSummaryContext(orgId: string): Promise<MorningSummaryContext> {
  const supabase = createClient();
  const today = todayLocalYmd();
  const staleCutoffIso = new Date(
    Date.now() - SEGUIMIENTO_STALE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { data: newInquiriesData },
    { data: offersToday },
    { data: visitsToday },
    { data: staleOffers },
    { data: staleInquiries },
    { data: pendingReservationsData },
  ] = await Promise.all([
    supabase
      .from("domus_general_inquiries")
      .select("message")
      .eq("org_id", orgId)
      .eq("status", "nuevo")
      .order("created_at", { ascending: false }),
    supabase
      .from("domus_property_offers")
      .select("owner_profile_id, scheduled_at")
      .eq("org_id", orgId)
      .eq("status", "reunion_agendada")
      .not("scheduled_at", "is", null),
    // Fase resumen ampliado: se suma product_id — antes solo se pedía
    // client_profile_id/visit_time, no alcanzaba para mostrar la
    // propiedad en el resumen (ver Gate 0).
    supabase
      .from("domus_property_visits")
      .select("client_profile_id, visit_time, product_id")
      .eq("org_id", orgId)
      .eq("status", "confirmed")
      .eq("visit_date", today),
    supabase
      .from("domus_property_offers")
      .select("owner_profile_id, created_at")
      .eq("org_id", orgId)
      .eq("status", "seguimiento")
      .lt("created_at", staleCutoffIso),
    supabase
      .from("domus_general_inquiries")
      .select("client_profile_id, created_at")
      .eq("org_id", orgId)
      .eq("status", "contactado")
      .lt("created_at", staleCutoffIso),
    // Fase resumen ampliado: reservas pendientes de confirmar — mismo
    // status que /dashboard/reservas lee para su bandeja.
    supabase
      .from("domus_property_reservations")
      .select("product_id, created_at")
      .eq("org_id", orgId)
      .eq("status", "pendiente_confirmacion"),
  ]);

  // Mismo criterio que domus-badge-counts.ts: scheduled_at es timestamptz,
  // se filtra por día en JS con localYmd (hora local), no con un rango en
  // la query.
  const offersTodayFiltered = (offersToday ?? []).filter(
    (o) => o.scheduled_at && localYmd(new Date(o.scheduled_at)) === today
  );

  const profileIds = Array.from(
    new Set([
      ...offersTodayFiltered.map((o) => o.owner_profile_id),
      ...(visitsToday ?? []).map((v) => v.client_profile_id),
      ...(staleOffers ?? []).map((o) => o.owner_profile_id),
      ...(staleInquiries ?? []).map((i) => i.client_profile_id),
    ])
  );
  // Fase resumen ampliado: productIds propias (visitas de hoy + reservas
  // pendientes) — mismo criterio de "solo pedir lo que hace falta" que
  // profileIds arriba.
  const productIds = Array.from(
    new Set([
      ...(visitsToday ?? []).map((v) => v.product_id),
      ...(pendingReservationsData ?? []).map((r) => r.product_id),
    ])
  );

  const [{ data: profilesData }, { data: productsData }] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    productIds.length > 0
      ? supabase.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]));
  const productNameById = new Map((productsData ?? []).map((p) => [p.id, p.name]));

  const meetingsToday = [
    ...offersTodayFiltered.map((o) => ({
      clientName: nameById.get(o.owner_profile_id) ?? "—",
      time: new Date(o.scheduled_at as string).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      kind: "reunion" as const,
    })),
    ...(visitsToday ?? []).map((v) => ({
      clientName: nameById.get(v.client_profile_id) ?? "—",
      time: v.visit_time.slice(0, 5),
      kind: "visita" as const,
      propertyName: productNameById.get(v.product_id) ?? "una propiedad",
    })),
  ];

  const staleFollowUps = [
    ...(staleOffers ?? []).map((o) => ({
      clientName: nameById.get(o.owner_profile_id) ?? "—",
      daysSince: daysSince(o.created_at),
    })),
    ...(staleInquiries ?? []).map((i) => ({
      clientName: nameById.get(i.client_profile_id) ?? "—",
      daysSince: daysSince(i.created_at),
    })),
  ];

  const pendingReservations = (pendingReservationsData ?? []).map((r) => ({
    propertyName: productNameById.get(r.product_id) ?? "una propiedad",
    hoursWaiting: hoursSince(r.created_at),
  }));

  return {
    newInquiries: (newInquiriesData ?? []).map((i) => ({
      message: i.message.slice(0, MESSAGE_PREVIEW_LENGTH),
    })),
    meetingsToday,
    staleFollowUps,
    pendingReservations,
  };
}
