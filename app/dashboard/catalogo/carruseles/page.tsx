import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { CarouselManager } from "./carousel-manager";

export default async function CarrucelesPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/login");

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("catalog_type")
    .eq("id", orgId)
    .maybeSingle();

  // Mismo gate que /dashboard/catalogo: los carruseles son parte del
  // sistema de catálogo de producto, no tienen sentido para una org de
  // catalog_type distinto (ej. price_list de Gym2/Cafetería/Corner).
  if (org?.catalog_type !== "products") redirect("/dashboard/catalogo");

  const { data: carousels } = await supabase
    .from("catalog_carousels")
    .select("id, title, display_order, active, autoplay, loop_infinite, autoplay_speed_ms, direction")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/catalogo"
          className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
        >
          ‹ Catálogo
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Carruseles</h1>
      </header>

      <div className="p-8 max-w-3xl">
        <CarouselManager carousels={carousels ?? []} />
      </div>
    </div>
  );
}
