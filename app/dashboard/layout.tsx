import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getOrgId();
  let catalogType: string | null = null;
  let hasGymFeatures = false;
  let isCornerOrg = false;
  if (orgId) {
    const [{ data: org }, { count: gymLocationsCount }] = await Promise.all([
      supabase
        .from("loyalty_organizations")
        .select("catalog_type, slug")
        .eq("id", orgId)
        .maybeSingle(),
      // Mismo criterio hasGymFeatures que el sitio público (org con filas
      // en gym_locations) — no hardcodeado a Gym2.
      supabase
        .from("gym_locations")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
    ]);
    catalogType = org?.catalog_type ?? null;
    hasGymFeatures = (gymLocationsCount ?? 0) > 0;
    // Fase 3 de Corner: panel de canchas (gym_courts), gateado por slug —
    // mismo criterio que isCornerOrgSlug en el sitio público, pero
    // chequeado acá directo (un solo flag, un solo archivo, no amerita
    // importar el helper del route group público).
    isCornerOrg = org?.slug === "corner";
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar
        userEmail={user.email ?? ""}
        showCatalog={catalogType === "products"}
        showGym={hasGymFeatures}
        showCourts={isCornerOrg}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
