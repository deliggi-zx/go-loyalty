import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { AppearanceForm } from "./appearance-form";
import { CarouselManager } from "./carousel-manager";
import { PriceListManager } from "./price-list-manager";

export default async function ConfiguracionPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/login");

  const [orgRes, contentRes] = await Promise.all([
    supabase
      .from("loyalty_organizations")
      .select(
        "id, slug, name, banner_url, background_url, background_color, primary_color, secondary_color, accent_color"
      )
      .eq("id", orgId)
      .single(),
    supabase
      .from("loyalty_content")
      .select("id, type, title, price, category, image_url, sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!orgRes.data) redirect("/login");

  const org = orgRes.data;
  const carouselItems =
    contentRes.data?.filter((c) => c.type === "carousel") ?? [];
  const priceItems =
    contentRes.data?.filter((c) => c.type === "price_list") ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">
            Configuración
          </h1>
          <p className="text-xs text-stone-400">
            Personalizá la página pública de tu comercio
          </p>
        </div>
        {org.slug && (
          <a
            href={`/${org.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
          >
            Ver página pública ↗
          </a>
        )}
      </header>

      <div className="p-8 space-y-10 max-w-3xl">
        <AppearanceForm org={org} />
        <CarouselManager orgId={orgId} items={carouselItems} />
        <PriceListManager orgId={orgId} items={priceItems} />
      </div>
    </div>
  );
}
