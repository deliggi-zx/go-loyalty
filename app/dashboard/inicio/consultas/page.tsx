import Link from "next/link";
import { redirect } from "next/navigation";
import { cn, formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

const ALLOWED_ROLES = ["admin"];

// Fase 4b: "recién llegadas, sin resolver todavía" — mezcla
// domus_general_inquiries (nuevo/contactado, no cerradas) con
// domus_property_offers (nuevo, recién llegadas sin revisar). Distinta
// de /dashboard/consultas (que muestra TODAS las consultas generales sin
// filtrar) — esta es la bandeja de entrada del mini-CRM, no el listado
// completo de esa tabla puntual.
export default async function InicioConsultasPage() {
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

  const [{ data: inquiries }, { data: offers }] = await Promise.all([
    supabase
      .from("domus_general_inquiries")
      .select("id, client_profile_id, phone, message, status, created_at")
      .eq("org_id", orgId)
      .in("status", ["nuevo", "contactado"]),
    supabase
      .from("domus_property_offers")
      .select("id, owner_profile_id, phone, operation_type, property_type, address, requested_price, currency, created_at")
      .eq("org_id", orgId)
      .eq("status", "nuevo"),
  ]);

  const profileIds = Array.from(
    new Set([
      ...(inquiries ?? []).map((i) => i.client_profile_id),
      ...(offers ?? []).map((o) => o.owner_profile_id),
    ])
  );
  const { data: profilesData } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]));

  interface Row {
    id: string;
    type: "consulta" | "oferta";
    name: string;
    phone: string;
    summary: string;
    createdAt: string;
    href: string;
  }

  const rows: Row[] = [
    ...(inquiries ?? []).map((i) => ({
      id: i.id,
      type: "consulta" as const,
      name: nameById.get(i.client_profile_id) ?? "—",
      phone: i.phone ?? "—",
      summary: i.message,
      createdAt: i.created_at,
      href: "/dashboard/consultas",
    })),
    ...(offers ?? []).map((o) => ({
      id: o.id,
      type: "oferta" as const,
      name: nameById.get(o.owner_profile_id) ?? "—",
      phone: o.phone,
      summary: `${o.property_type} en ${o.operation_type} — ${o.address} — ${formatPrice(
        o.requested_price,
        o.currency
      )}`,
      createdAt: o.created_at,
      href: "/dashboard/ofertas",
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/inicio" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          ‹ Inicio
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Consultas</h1>
      </header>

      <div className="p-8">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
            No hay nada pendiente por resolver.
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {rows.map((row) => (
              <Link
                key={`${row.type}-${row.id}`}
                href={row.href}
                className="block bg-white rounded-xl border border-stone-200 p-4 space-y-1 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-900">
                    {row.name} · {row.phone}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium",
                      row.type === "consulta" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
                    )}
                  >
                    {row.type === "consulta" ? "Consulta general" : "Oferta de propiedad"}
                  </span>
                </div>
                <p className="text-sm text-stone-600">{row.summary}</p>
                <p className="text-xs text-stone-400">
                  {new Date(row.createdAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
