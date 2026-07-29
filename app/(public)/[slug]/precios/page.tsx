import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg } from "../data";
import { PriceFlyers } from "../price-flyers";

export default async function PreciosPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const supabase = createClient();
  const { data: content } = await supabase
    .from("loyalty_content")
    .select("id, image_url, sort_order")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .eq("type", "price_list")
    .order("sort_order", { ascending: true });

  const priceFlyers = content ?? [];

  return (
    <div>
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Link
          href={`/${params.slug}`}
          className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>
      </div>

      {priceFlyers.length > 0 ? (
        <PriceFlyers
          items={priceFlyers}
          backgroundColor={org.background_color}
          backgroundUrl={org.background_url}
        />
      ) : (
        <p className="text-center text-sm text-stone-400 py-16">
          Todavía no hay lista de precios cargada.
        </p>
      )}
    </div>
  );
}
