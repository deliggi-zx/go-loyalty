import Link from "next/link";
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
    .select("catalog_type, slug")
    .eq("id", orgId)
    .maybeSingle();

  if (org?.catalog_type !== "products") redirect("/dashboard");

  // Fase catálogo Domus: categorías colapsadas + "Agregar propiedad" en
  // vez de "Nuevo producto" — mismo criterio simple de slug directo que
  // el resto de las fases Domus (ProductForm, ProductImagesManager).
  const isDomus = org?.slug === "domus";

  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, display_order, parent_id, leaf_source")
      .eq("org_id", orgId)
      .order("display_order", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, price, currency, active, is_featured, category_id, display_order")
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
          .select("product_id, image_url, display_order, media_type")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
      : {
          data: [] as {
            product_id: string;
            image_url: string;
            display_order: number;
            media_type: string;
          }[],
        };

  // Fase video: la card del listado renderiza con <img>, un video en
  // display_order 0 nunca puede quedar elegido como portada acá.
  const mainImageByProduct = new Map<string, string>();
  for (const img of images ?? []) {
    if (img.media_type === "video") continue;
    if (!mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.image_url);
    }
  }

  const products: ProductRow[] = productsData.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
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
        <Link
          href="/dashboard/catalogo/carruseles"
          className="text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-4 py-2 rounded-lg transition-colors"
        >
          Carruseles de la home →
        </Link>
      </header>

      <div className="p-8 space-y-10 max-w-5xl">
        <CategoryManager categories={categories} isDomus={isDomus} />
        <ProductsList products={products} categories={categories} isDomus={isDomus} />
      </div>
    </div>
  );
}
