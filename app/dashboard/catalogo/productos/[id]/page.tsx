import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ProductForm } from "../../product-form";
import { ProductImagesManager } from "../../product-images-manager";
import { ProductSpecsManager } from "../../product-specs-manager";
import { ProductCarouselsManager } from "../../product-carousels-manager";

export default async function EditarProductoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const [{ data: product }, { data: categories }, { data: images }, { data: carousels }, { data: carouselLinks }, { data: org }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, price, currency, category_id, active, brand, screen_size_inches, specs, compare_at_price, installments_text, shipping_badge_text"
        )
        .eq("id", params.id)
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase
        .from("product_categories")
        .select("id, name, parent_id")
        .eq("org_id", orgId)
        .order("display_order", { ascending: true }),
      supabase
        .from("product_images")
        .select("id, image_url, display_order, media_type")
        .eq("product_id", params.id)
        .order("display_order", { ascending: true }),
      // Fase Home: todos los carruseles de la org (activos o no, ver
      // ProductCarouselsManager) para armar la lista de checkboxes.
      supabase
        .from("catalog_carousels")
        .select("id, title, active")
        .eq("org_id", orgId)
        .order("display_order", { ascending: true }),
      supabase
        .from("catalog_carousel_products")
        .select("carousel_id")
        .eq("product_id", params.id),
      // Fase moneda/cuotas: mismo criterio que productos/nuevo/page.tsx —
      // ver comentario ahí.
      supabase.from("loyalty_organizations").select("slug").eq("id", orgId).maybeSingle(),
    ]);

  if (!product) return notFound();

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/catalogo"
          className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
        >
          ‹ Catálogo
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">{product.name}</h1>
      </header>

      <div className="p-8 space-y-10">
        <ProductForm categories={categories ?? []} product={product} orgSlug={org?.slug} />
        <ProductImagesManager
          orgId={orgId}
          productId={product.id}
          images={images ?? []}
          orgSlug={org?.slug}
        />
        <ProductSpecsManager
          productId={product.id}
          specs={(product.specs as Record<string, string> | null) ?? {}}
        />
        <ProductCarouselsManager
          productId={product.id}
          carousels={carousels ?? []}
          initialSelectedIds={(carouselLinks ?? []).map((l) => l.carousel_id)}
        />
      </div>
    </div>
  );
}
