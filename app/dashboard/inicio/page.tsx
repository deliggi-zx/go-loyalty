import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, MessageSquare, CalendarClock, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { DomusMobileHome } from "./domus-mobile-home";

// Mismo gate exacto que Visitas/Consultas/Ofertas — slug domus + role
// admin.
const ALLOWED_ROLES = ["admin"];

const MENU_ITEMS = [
  {
    href: "/dashboard/inicio/contactos",
    label: "Contactos",
    description: "Directorio único de todas las personas que se contactaron",
    icon: Users,
  },
  {
    href: "/dashboard/inicio/consultas",
    label: "Consultas",
    description: "Lo que llegó nuevo, todavía sin resolver",
    icon: MessageSquare,
  },
  {
    href: "/dashboard/inicio/reuniones",
    label: "Reuniones",
    description: "Visitas confirmadas y reuniones agendadas, por fecha",
    icon: CalendarClock,
  },
  {
    href: "/dashboard/inicio/seguimiento",
    label: "Seguimiento",
    description: "Para no perderle el hilo a nada",
    icon: Eye,
  },
];

// Fase 4b: home propia del agente — panel visual con botones grandes, no
// un dashboard tradicional (pedido explícito, ver documento de visión de
// Domus). No reemplaza el redirect de /login (ver Gate 0 de esta fase:
// app/login/actions.ts es compartido por todas las orgs, riesgoso de
// tocar) — vive como primer ítem del sidebar ("Inicio"). Cada botón lleva
// a una lista propia que mezcla domus_general_inquiries/
// domus_property_offers/domus_property_visits al momento de mostrar, sin
// tabla nueva — ver cada subpágina.
export default async function InicioPage() {
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

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Inicio</h1>
          <p className="text-xs text-stone-400">Tu mini-CRM: no perderle el hilo a nada</p>
        </div>
      </header>

      {/* Fase Home mobile Domus (CAMBIO 2): por debajo de md, esta misma
          pantalla se reemplaza por los 5 botones grandes de
          DomusMobileHome (mismos 4 destinos + Catálogo) — el sidebar no
          es alcanzable en mobile para este role (ver DashboardShell,
          hideMobileNav), así que esta pantalla ES la navegación completa
          del agente en el celular. En md y superior, la grilla de
          siempre, sin cambios. */}
      <div className="md:hidden">
        <DomusMobileHome />
      </div>

      <div className="hidden md:block p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {MENU_ITEMS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Icon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-stone-900">{label}</p>
                <p className="text-sm text-stone-500 mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
