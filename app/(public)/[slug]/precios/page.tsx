import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getProductCatalog, getProductCategories } from "../data";
import { PriceFlyers } from "../price-flyers";
import { ProductCatalog } from "../product-catalog";

export default async function PreciosPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { categoria?: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  if (org.catalog_type === "products") {
    const [categories, products] = await Promise.all([
      getProductCategories(org.id),
      getProductCatalog(org.id),
    ]);

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

        <ProductCatalog
          slug={params.slug}
          products={products}
          categories={categories}
          primaryColor={org.primary_color ?? "#f59e0b"}
          initialCategoryId={searchParams.categoria ?? null}
        />
      </div>
    );
  }

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
