import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ContactosManager, type ContactRow, type ContactInteraction } from "./contactos-manager";

// Fase reorganizar panel: antes solo admin, ahora también agente — mismo
// criterio ya aplicado a Consultas (Fase 1c) y a los demás destinos del
// panel del agente.
const ALLOWED_ROLES = ["admin", "agente"];

// Fase 4b: directorio único — junta domus_general_inquiries +
// domus_property_offers + domus_property_visits agrupadas por
// profile_id, sin tabla nueva (mismo profile puede aparecer en las 3, acá
// aparece una sola vez con todas sus interacciones listadas). Solo
// lectura, sin acciones — el punto es tener panorama, las acciones de
// cambio de estado siguen viviendo en Consultas/Ofertas-Reservas/Visitas.
// Fase Cartera de clientes: arma los datos acá (server) y delega el
// orden alfabético/buscador/colapsado a ContactosManager (client) — ver
// Gate 0 sobre por qué se extrajo.
export default async function ContactosPage() {
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

  const isKapusta = org?.slug === "kapusta";

  const [{ data: inquiries }, { data: offers }, { data: visits }] = await Promise.all([
    supabase
      .from("domus_general_inquiries")
      .select("client_profile_id, phone, message, created_at")
      .eq("org_id", orgId),
    supabase
      .from("domus_property_offers")
      .select("owner_profile_id, phone, operation_type, property_type, address, created_at")
      .eq("org_id", orgId),
    supabase
      .from("domus_property_visits")
      .select("client_profile_id, phone, product_id, visit_date, visit_time, created_at")
      .eq("org_id", orgId)
      .eq("status", "confirmed"),
  ]);

  const productIds = Array.from(new Set((visits ?? []).map((v) => v.product_id)));
  const { data: productsData } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((productsData ?? []).map((p) => [p.id, p.name]));

  interface Contact {
    profileId: string;
    phone: string;
    // createdAt de la interacción que puso `phone` — se compara en cada
    // touch() para saber si hay que reemplazarlo, independiente del
    // orden de iteración de las 3 queries (interactions recién se ordena
    // al final, no sirve como referencia de "más reciente" mientras se
    // arma el map).
    phoneUpdatedAt: string;
    interactions: ContactInteraction[];
  }
  const contactsById = new Map<string, Contact>();

  function touch(profileId: string, phone: string, createdAt: string, interaction: ContactInteraction) {
    const existing = contactsById.get(profileId);
    if (existing) {
      existing.interactions.push(interaction);
      // El teléfono más reciente gana — un mismo dueño pudo cargar
      // números distintos en cada formulario a lo largo del tiempo.
      if (createdAt > existing.phoneUpdatedAt) {
        existing.phone = phone;
        existing.phoneUpdatedAt = createdAt;
      }
    } else {
      contactsById.set(profileId, { profileId, phone, phoneUpdatedAt: createdAt, interactions: [interaction] });
    }
  }

  for (const i of inquiries ?? []) {
    touch(i.client_profile_id, i.phone ?? "—", i.created_at, {
      type: "consulta",
      createdAt: i.created_at,
      summary: i.message,
    });
  }
  for (const o of offers ?? []) {
    touch(o.owner_profile_id, o.phone, o.created_at, {
      type: "oferta",
      createdAt: o.created_at,
      summary: `${o.property_type} en ${o.operation_type} — ${o.address}`,
    });
  }
  for (const v of visits ?? []) {
    touch(v.client_profile_id, v.phone ?? "—", v.created_at, {
      type: "visita",
      createdAt: v.created_at,
      summary: `${productNameById.get(v.product_id) ?? "Propiedad"} — ${new Date(
        `${v.visit_date}T00:00:00`
      ).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} ${v.visit_time.slice(0, 5)}`,
    });
  }

  const profileIds = Array.from(contactsById.keys());
  const [{ data: profilesData }, { data: detailsData }] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    // Fase registro extendido: apellido/teléfono/profesión/presupuesto/
    // zona cargados al registrarse — solo existen para quien se registró
    // después de esta fase, el resto simplemente no tiene fila acá
    // (ausencia normal, no un error).
    profileIds.length > 0
      ? supabase
          .from("domus_client_profile_details")
          .select("profile_id, last_name, phone, profession, budget_range, interest_zone")
          .eq("org_id", orgId)
          .in("profile_id", profileIds)
      : Promise.resolve({
          data: [] as {
            profile_id: string;
            last_name: string;
            phone: string | null;
            profession: string | null;
            budget_range: string | null;
            interest_zone: string | null;
          }[],
        }),
  ]);
  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]));
  const detailsByProfileId = new Map((detailsData ?? []).map((d) => [d.profile_id, d]));

  // Fase Cartera de clientes: sin el sort de "más reciente primero" de
  // antes — ContactosManager ordena alfabético él solo. Acá solo se
  // ordenan las interactions de cada contacto (más reciente primero
  // adentro del historial, sigue teniendo sentido) y se arma lastContactAt.
  const contacts: ContactRow[] = Array.from(contactsById.values()).map((c) => {
    const details = detailsByProfileId.get(c.profileId);
    const firstName = nameById.get(c.profileId) ?? "—";
    const sortedInteractions = [...c.interactions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return {
      profileId: c.profileId,
      phone: c.phone,
      name: details?.last_name ? `${firstName} ${details.last_name}` : firstName,
      profession: details?.profession ?? null,
      budgetRange: details?.budget_range ?? null,
      interestZone: details?.interest_zone ?? null,
      lastContactAt: sortedInteractions[0].createdAt,
      interactions: sortedInteractions,
    };
  });

  return (
    <div className={cn("flex-1 overflow-y-auto", isKapusta && "bg-white")}>
      <header
        className={cn(
          "border-b px-8 h-16 flex items-center gap-3 shrink-0",
          isKapusta ? "bg-[#69BDE1] border-[#4FA6D3]" : "bg-white border-stone-200"
        )}
      >
        <Link
          href="/dashboard/inicio"
          className={cn(
            "text-sm transition-colors",
            isKapusta ? "text-[#0B1417]/70 hover:text-[#0B1417]" : "text-stone-400 hover:text-stone-700"
          )}
        >
          ‹ Inicio
        </Link>
        <h1 className={cn("text-lg font-semibold", isKapusta ? "text-[#0B1417]" : "text-stone-900")}>
          {isKapusta ? "Cartera de clientes" : "Contactos"}
        </h1>
      </header>

      <div className="p-8">
        <ContactosManager contacts={contacts} glass={isKapusta} />
      </div>
    </div>
  );
}
