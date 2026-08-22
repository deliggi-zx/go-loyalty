import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

const ALLOWED_ROLES = ["admin"];

interface Interaction {
  type: "consulta" | "oferta" | "visita";
  createdAt: string;
  summary: string;
}

const TYPE_LABEL: Record<Interaction["type"], string> = {
  consulta: "Consulta",
  oferta: "Oferta de propiedad",
  visita: "Visita a propiedad",
};

const TYPE_BADGE_CLASS: Record<Interaction["type"], string> = {
  consulta: "bg-sky-50 text-sky-700",
  oferta: "bg-violet-50 text-violet-700",
  visita: "bg-emerald-50 text-emerald-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fase 4b: directorio único — junta domus_general_inquiries +
// domus_property_offers + domus_property_visits agrupadas por
// profile_id, sin tabla nueva (mismo profile puede aparecer en las 3, acá
// aparece una sola vez con todas sus interacciones listadas). Solo
// lectura, sin acciones — el punto es tener panorama, las acciones de
// cambio de estado siguen viviendo en Consultas/Ofertas/Visitas.
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

  if (org?.slug !== "domus") redirect("/dashboard");
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) redirect("/dashboard");

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
    interactions: Interaction[];
  }
  const contactsById = new Map<string, Contact>();

  function touch(profileId: string, phone: string, createdAt: string, interaction: Interaction) {
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

  const contacts = Array.from(contactsById.values())
    .map((c) => {
      const details = detailsByProfileId.get(c.profileId);
      const firstName = nameById.get(c.profileId) ?? "—";
      return {
        ...c,
        name: details?.last_name ? `${firstName} ${details.last_name}` : firstName,
        profession: details?.profession ?? null,
        budgetRange: details?.budget_range ?? null,
        interestZone: details?.interest_zone ?? null,
        interactions: c.interactions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      };
    })
    .sort((a, b) =>
      a.interactions[0].createdAt < b.interactions[0].createdAt ? 1 : -1
    );

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/inicio" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          ‹ Inicio
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Contactos</h1>
      </header>

      <div className="p-8">
        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
            Todavía no hay contactos.
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {contacts.map((c) => (
              <div key={c.profileId} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500">
                    {c.phone} · último contacto {formatDate(c.interactions[0].createdAt)}
                  </p>
                  {/* Fase registro extendido: solo aparece para quien se
                      registró cargando estos datos — el resto de los
                      contactos (llegaron sin registrarse, o se
                      registraron antes de esta fase) no muestra nada acá. */}
                  {(c.profession || c.budgetRange || c.interestZone) && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {[
                        c.profession && `Profesión: ${c.profession}`,
                        c.budgetRange && `Presupuesto: ${c.budgetRange}`,
                        c.interestZone && `Zona: ${c.interestZone}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  {c.interactions.map((int, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium mt-0.5",
                          TYPE_BADGE_CLASS[int.type]
                        )}
                      >
                        {TYPE_LABEL[int.type]}
                      </span>
                      <span className="text-stone-600">{int.summary}</span>
                      <span className="text-stone-400 text-xs ml-auto shrink-0">
                        {formatDate(int.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
