import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { CarouselManager } from "./carousel-manager";
import { HomeBlocksManager } from "./home-blocks-manager";

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
    .select("id, title, display_order, active, autoplay")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  // Fase intercalado: secuencia unificada de la home (carruseles + promos
  // mezclados, un solo display_order compartido — ver catalog_home_blocks
  // y getHomeSequence en app/(public)/[slug]/data.ts). Acá se arma el join
  // manual (mismo criterio que getActiveCarousels) para mostrar el título
  // real de cada carrusel o la miniatura de cada promo en la lista.
  const { data: homeBlocksData } = await supabase
    .from("catalog_home_blocks")
    .select("id, block_type, display_order, carousel_id, promo_content_id")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  const homeBlocks = homeBlocksData ?? [];
  const blockCarouselIds = homeBlocks
    .filter((b) => b.block_type === "carousel" && b.carousel_id)
    .map((b) => b.carousel_id as string);
  const blockPromoIds = homeBlocks
    .filter((b) => b.block_type === "promo" && b.promo_content_id)
    .map((b) => b.promo_content_id as string);

  const [{ data: blockCarousels }, { data: blockPromos }] = await Promise.all([
    blockCarouselIds.length > 0
      ? supabase.from("catalog_carousels").select("id, title").in("id", blockCarouselIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    blockPromoIds.length > 0
      ? supabase.from("loyalty_content").select("id, image_url").in("id", blockPromoIds)
      : Promise.resolve({ data: [] as { id: string; image_url: string | null }[] }),
  ]);

  const carouselTitleById = new Map((blockCarousels ?? []).map((c) => [c.id, c.title]));
  const promoImageById = new Map((blockPromos ?? []).map((p) => [p.id, p.image_url]));

  const homeBlockRows = homeBlocks.map((b) => ({
    id: b.id,
    display_order: b.display_order,
    block_type: b.block_type as "carousel" | "promo",
    label:
      b.block_type === "carousel"
        ? carouselTitleById.get(b.carousel_id ?? "") ?? "Carrusel"
        : "Promo",
    imageUrl: b.block_type === "promo" ? promoImageById.get(b.promo_content_id ?? "") ?? null : null,
  }));

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

      <div className="p-8 max-w-3xl space-y-10">
        <HomeBlocksManager items={homeBlockRows} />
        <CarouselManager carousels={carousels ?? []} />
      </div>
    </div>
  );
}
