import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { buildGoogleCalendarUrl } from "@/lib/google-calendar";
import { MeetingForm } from "./meeting-form";

const ALLOWED_ROLES = ["admin", "agente"];

// Fase 4b: vista de equipo (no la agenda de un solo agente como
// /dashboard/visitas). Para Kapusta se separa en dos listados (Visitas /
// Reuniones), se suma la carga manual de reuniones (kapusta_meetings) y
// el espejo en Google Calendar, y el estilo pasa a "simil vidrio". Domus
// sigue con el listado único de siempre.
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

  const isKapusta = org?.slug === "kapusta";

  const [{ data: offers }, { data: visits }, { data: meetings }] = await Promise.all([
    supabase
      .from("domus_property_offers")
      .select("id, owner_profile_id, phone, operation_type, property_type, address, scheduled_at")
      .eq("org_id", orgId)
      .eq("status", "reunion_agendada"),
    supabase
      .from("domus_property_visits")
      .select(
        "id, client_profile_id, agent_profile_id, phone, product_id, visit_date, visit_time, visit_mode"
      )
      .eq("org_id", orgId)
      .eq("status", "confirmed"),
    isKapusta
      ? supabase
          .from("kapusta_meetings")
          .select("id, title, meeting_date, meeting_time, location, notes, google_synced, created_by")
          .eq("org_id", orgId)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const productIds = Array.from(new Set((visits ?? []).map((v) => v.product_id)));
  const profileIds = Array.from(
    new Set([
      ...(offers ?? []).map((o) => o.owner_profile_id),
      ...(visits ?? []).map((v) => v.client_profile_id),
      ...(visits ?? []).map((v) => v.agent_profile_id),
      ...(meetings ?? []).map((m) => m.created_by),
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

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  // ── Listado de VISITAS ──
  interface VisitRow {
    id: string;
    when: string;
    property: string;
    client: string;
    agent: string;
    phone: string;
    mode: "con_agente" | "retira_llave";
  }
  const visitRows: VisitRow[] = (visits ?? [])
    .map((v) => ({
      id: v.id,
      when: `${v.visit_date}T${v.visit_time}`,
      property: productNameById.get(v.product_id) ?? "Propiedad",
      client: nameById.get(v.client_profile_id) ?? "—",
      agent: nameById.get(v.agent_profile_id) ?? "—",
      phone: v.phone ?? "—",
      mode: (v.visit_mode as VisitRow["mode"]) ?? "con_agente",
    }))
    .sort((a, b) => (a.when < b.when ? -1 : 1));

  // ── Listado de REUNIONES (ofertas con reunión + manuales) ──
  interface MeetingRow {
    id: string;
    when: string;
    title: string;
    subtitle: string;
    location: string;
    calendarDetails: string;
    source: "oferta" | "manual";
    synced?: boolean;
  }
  const meetingRows: MeetingRow[] = [
    ...(offers ?? [])
      .filter((o) => o.scheduled_at)
      .map((o) => {
        const clientName = nameById.get(o.owner_profile_id) ?? "—";
        return {
          id: o.id,
          when: o.scheduled_at as string,
          title: `Reunión con ${clientName}`,
          subtitle: `${o.property_type} en ${o.operation_type} — ${o.address} · ${o.phone}`,
          location: o.address,
          calendarDetails: `Teléfono: ${o.phone}\n${o.property_type} en ${o.operation_type}`,
          source: "oferta" as const,
        };
      }),
    ...(meetings ?? []).map((m) => ({
      id: m.id,
      when: `${m.meeting_date}T${m.meeting_time}`,
      title: m.title,
      subtitle: [
        m.location,
        m.notes,
        `cargó ${nameById.get(m.created_by) ?? "—"}`,
      ]
        .filter(Boolean)
        .join(" · "),
      location: m.location ?? "",
      calendarDetails: m.notes ?? "",
      source: "manual" as const,
      synced: m.google_synced,
    })),
  ].sort((a, b) => (a.when < b.when ? -1 : 1));

  // ── Estilos ──
  const shellClass = cn("flex-1 overflow-y-auto", isKapusta && "bg-white");
  const headerClass = cn(
    "border-b px-8 h-16 flex items-center gap-3 shrink-0",
    isKapusta ? "bg-[#69BDE1] border-[#4FA6D3]" : "bg-white border-stone-200"
  );
  const backClass = cn(
    "text-sm transition-colors",
    isKapusta ? "text-[#0B1417]/70 hover:text-[#0B1417]" : "text-stone-400 hover:text-stone-700"
  );
  const h1Class = cn("text-lg font-semibold", isKapusta ? "text-[#0B1417]" : "text-stone-900");
  const cardClass = isKapusta
    ? "kap-glass rounded-2xl p-4 space-y-1"
    : "bg-white rounded-xl border border-stone-200 p-4 space-y-1";
  const sectionTitleClass = cn(
    "text-xs font-bold uppercase tracking-wide",
    isKapusta ? "text-[#0B1417]/60" : "text-stone-500"
  );
  const emptyClass = cn(
    "rounded-xl py-10 text-center text-sm",
    isKapusta ? "kap-glass text-[#0B1417]/60" : "bg-white border border-dashed border-stone-200 text-stone-400"
  );
  const primaryText = isKapusta ? "text-[#0B1417]" : "text-stone-900";
  const secondaryText = isKapusta ? "text-[#0B1417]/80" : "text-stone-600";
  const mutedText = isKapusta ? "text-[#0B1417]/55" : "text-stone-500";

  return (
    <div className={shellClass}>
      <header className={headerClass}>
        <Link href="/dashboard/inicio" className={backClass}>
          ‹ Inicio
        </Link>
        <h1 className={h1Class}>Visitas/Reuniones</h1>
      </header>

      <div className="p-8 max-w-3xl space-y-8">
        {isKapusta && (
          <div className="flex justify-end">
            <MeetingForm glass />
          </div>
        )}

        {/* ── Visitas programadas ── */}
        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Visitas programadas</h2>
          {visitRows.length === 0 ? (
            <div className={emptyClass}>No hay visitas programadas.</div>
          ) : (
            <div className="space-y-3">
              {visitRows.map((v) => (
                <div key={v.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-sm font-semibold", primaryText)}>{v.property}</p>
                    <span
                      className={cn(
                        "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium",
                        v.mode === "con_agente"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {v.mode === "con_agente" ? "Con agente" : "Retira llave"}
                    </span>
                  </div>
                  <p className={cn("text-sm", secondaryText)}>
                    {v.client} · {v.phone} — agente: {v.agent}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <p className={cn("text-xs font-medium", mutedText)}>{fmtWhen(v.when)}</p>
                    <a
                      href={buildGoogleCalendarUrl({
                        title: `Visita a ${v.property}`,
                        start: new Date(v.when),
                        details: `Cliente: ${v.client}\nTeléfono: ${v.phone}\nAgente: ${v.agent}\nModalidad: ${
                          v.mode === "con_agente" ? "con agente" : "retira llave"
                        }`,
                        location: v.property,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium transition-colors",
                        isKapusta
                          ? "text-[#0B1417]/60 hover:text-[#0B1417]"
                          : "text-stone-500 hover:text-stone-800"
                      )}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Agregar a Google Calendar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Reuniones programadas ── */}
        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Reuniones programadas</h2>
          {meetingRows.length === 0 ? (
            <div className={emptyClass}>No hay reuniones programadas.</div>
          ) : (
            <div className="space-y-3">
              {meetingRows.map((m) => (
                <div key={`${m.source}-${m.id}`} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-sm font-semibold", primaryText)}>{m.title}</p>
                    {m.source === "manual" && (
                      <span
                        className={cn(
                          "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium",
                          m.synced ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
                        )}
                      >
                        {m.synced ? "En Calendar" : "Sin sincronizar"}
                      </span>
                    )}
                  </div>
                  {m.subtitle && <p className={cn("text-sm", secondaryText)}>{m.subtitle}</p>}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <p className={cn("text-xs font-medium", mutedText)}>{fmtWhen(m.when)}</p>
                    <a
                      href={buildGoogleCalendarUrl({
                        title: m.title,
                        start: new Date(m.when),
                        details: m.calendarDetails,
                        location: m.location || undefined,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium transition-colors",
                        isKapusta
                          ? "text-[#0B1417]/60 hover:text-[#0B1417]"
                          : "text-stone-500 hover:text-stone-800"
                      )}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Agregar a Google Calendar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
