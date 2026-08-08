import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { CategoryManager } from "./category-manager";
import { ProductsList, type ProductRow } from "./products-list";

export default async function CatalogoPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/login");

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("catalog_type")
    .eq("id", orgId)
    .maybeSingle();

  if (org?.catalog_type !== "products") redirect("/dashboard");

  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, display_order")
      .eq("org_id", orgId)
      .order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, price, active, is_featured, category_id, display_order")
      .eq("org_id", orgId)
      .order("display_order", { ascending: true }),
  ]);

  const categories = categoriesRes.data ?? [];
  const productsData = productsRes.data ?? [];
  const productIds = productsData.map((p) => p.id);

  const { data: images } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("product_id, image_url, display_order")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
      : { data: [] as { product_id: string; image_url: string; display_order: number }[] };

  const mainImageByProduct = new Map<string, string>();
  for (const img of images ?? []) {
    if (!mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.image_url);
    }
  }

  const products: ProductRow[] = productsData.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    active: p.active ?? true,
    is_featured: p.is_featured ?? false,
    category_id: p.category_id,
    mainImageUrl: mainImageByProduct.get(p.id) ?? null,
  }));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Catálogo</h1>
          <p className="text-xs text-stone-400">
            Gestioná las categorías y productos de tu negocio
          </p>
        </div>
      </header>

      <div className="p-8 space-y-10 max-w-5xl">
        <CategoryManager categories={categories} />
        <ProductsList products={products} categories={categories} />
      </div>
    </div>
  );
}
