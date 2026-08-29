import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";

// Fase reorganizar panel: antes solo admin, ahora también agente — mismo
// criterio ya aplicado a Consultas (Fase 1c) y a los demás destinos del
// panel del agente.
const ALLOWED_ROLES = ["admin", "agente"];

// Fase 4b: mezcla domus_property_offers (reunion_agendada, con
// scheduled_at de la Fase 4a) + domus_property_visits (confirmed, ya
// tienen fecha/hora) — a diferencia de /dashboard/visitas (agenda de UN
// SOLO agente), acá es la vista de equipo completa, con el agente
// asignado visible en cada fila para no perder de vista quién se ocupa
// de qué. Ordenado por fecha ascendente (la más próxima primero).
export default async function InicioReunionesPage() {
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

  const [{ data: offers }, { data: visits }] = await Promise.all([
    supabase
      .from("domus_property_offers")
      .select("id, owner_profile_id, phone, operation_type, property_type, address, scheduled_at")
      .eq("org_id", orgId)
      .eq("status", "reunion_agendada"),
    supabase
      .from("domus_property_visits")
      .select("id, client_profile_id, agent_profile_id, phone, product_id, visit_date, visit_time")
      .eq("org_id", orgId)
      .eq("status", "confirmed"),
  ]);

  const productIds = Array.from(new Set((visits ?? []).map((v) => v.product_id)));
  const profileIds = Array.from(
    new Set([
      ...(offers ?? []).map((o) => o.owner_profile_id),
      ...(visits ?? []).map((v) => v.client_profile_id),
      ...(visits ?? []).map((v) => v.agent_profile_id),
    ])
  );

  const [{ data: productsData }, { data: profilesData }] = await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const productNameById = new Map((productsData ?? []).map((p) => [p.id, p.name]));
  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]));

  interface Row {
    id: string;
    type: "oferta" | "visita";
    when: string; // ISO, para ordenar y mostrar
    title: string;
    subtitle: string;
    // Fase 6: piezas sueltas para armar el link de Google Calendar — no
    // alcanza con title/subtitle ya armados como texto libre, hace falta
    // el detalle estructurado (ver buildGoogleCalendarUrl).
    calendarTitle: string;
    calendarDetails: string;
    calendarLocation: string;
  }

  const rows: Row[] = [
    ...(offers ?? [])
      .filter((o) => o.scheduled_at)
      .map((o) => {
        const clientName = nameById.get(o.owner_profile_id) ?? "—";
        return {
          id: o.id,
          type: "oferta" as const,
          when: o.scheduled_at as string,
          title: `Reunión con ${clientName} (${o.phone})`,
          subtitle: `${o.property_type} en ${o.operation_type} — ${o.address}`,
          calendarTitle: `Reunión con ${clientName}`,
          calendarDetails: `Teléfono: ${o.phone}\n${o.property_type} en ${o.operation_type}`,
          calendarLocation: o.address,
        };
      }),
    ...(visits ?? []).map((v) => {
      const clientName = nameById.get(v.client_profile_id) ?? "—";
      const propertyName = productNameById.get(v.product_id) ?? "Propiedad";
      const agentName = nameById.get(v.agent_profile_id) ?? "—";
      return {
        id: v.id,
        type: "visita" as const,
        when: `${v.visit_date}T${v.visit_time}`,
        title: `Visita con ${clientName} (${v.phone ?? "—"})`,
        subtitle: `${propertyName} — agente: ${agentName}`,
        calendarTitle: `Visita a ${propertyName}`,
        calendarDetails: `Cliente: ${clientName}\nTeléfono: ${v.phone ?? "—"}\nAgente: ${agentName}`,
        calendarLocation: propertyName,
      };
    }),
  ].sort((a, b) => (a.when < b.when ? -1 : 1));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/inicio" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          ‹ Inicio
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Reuniones/Visitas</h1>
      </header>

      <div className="p-8">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
            No hay reuniones ni visitas agendadas.
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {rows.map((row) => (
              <div key={`${row.type}-${row.id}`} className="bg-white rounded-xl border border-stone-200 p-4 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-900">{row.title}</p>
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium",
                      row.type === "oferta" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {row.type === "oferta" ? "Reunión" : "Visita"}
                  </span>
                </div>
                <p className="text-sm text-stone-600">{row.subtitle}</p>
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <p className="text-xs font-medium text-stone-500">
                    {new Date(row.when).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {/* Fase 6: sin OAuth ni sincronización — un link que abre
                      Google Calendar con el evento precargado, el agente
                      lo confirma y lo guarda del lado de Google a mano
                      (ver comentario en lib/google-calendar.ts). */}
                  <a
                    href={buildGoogleCalendarUrl({
                      title: row.calendarTitle,
                      start: new Date(row.when),
                      details: row.calendarDetails,
                      location: row.calendarLocation,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Agregar a Google Calendar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
