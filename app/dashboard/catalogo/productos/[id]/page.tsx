import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { hasFeature } from "@/lib/features";
import { ProductForm } from "../../product-form";
import { ProductImagesManager } from "../../product-images-manager";
import { ProductSpecsManager } from "../../product-specs-manager";
import { PropertySpecsForm } from "../../property-specs-form";
import { ProductCarouselsManager } from "../../product-carousels-manager";
import { BackToCatalogLink } from "../../back-to-catalog-link";
import { PublishBar } from "../../publish-bar";

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { nuevo?: string };
}) {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const [{ data: product }, { data: categories }, { data: images }, { data: carousels }, { data: carouselLinks }, { data: org }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, price, currency, category_id, active, brand, screen_size_inches, specs, compare_at_price, installments_text, shipping_badge_text, sale_active, sale_price, sale_currency, rental_active, rental_price, rental_currency"
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
      supabase
        .from("loyalty_organizations")
        .select("slug, feature_tier, feature_overrides")
        .eq("id", orgId)
        .maybeSingle(),
    ]);

  if (!product) return notFound();

  // Catálogo inmobiliario (feature "catalogo_propiedades"): el editor de
  // specs genérico clave/valor se reemplaza por el formulario del rubro.
  const isDomus = hasFeature(org, "catalogo_propiedades");

  // ?nuevo=1 llega desde product-form.tsx solo la vez que se acaba de
  // crear el producto (ver comentario ahí y en back-to-catalog-link.tsx)
  // — distingue "recién creado, cargando fotos" de "editando uno viejo".
  const justCreated = searchParams.nuevo === "1";

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <BackToCatalogLink label="‹ Catálogo" justPublished={justCreated} />
        <h1 className="text-lg font-semibold text-stone-900">{product.name}</h1>
      </header>

      <div className="p-8 space-y-10">
        <ProductForm categories={categories ?? []} product={product} isRealEstate={isDomus} />
        <ProductImagesManager
          orgId={orgId}
          productId={product.id}
          images={images ?? []}
          isRealEstate={isDomus}
        />
        {justCreated && <PublishBar isRealEstate={isDomus} />}
        {isDomus ? (
          <PropertySpecsForm
            productId={product.id}
            specs={(product.specs as Record<string, string> | null) ?? {}}
          />
        ) : (
          <ProductSpecsManager
            productId={product.id}
            specs={(product.specs as Record<string, string> | null) ?? {}}
          />
        )}
        <ProductCarouselsManager
          productId={product.id}
          carousels={carousels ?? []}
          initialSelectedIds={(carouselLinks ?? []).map((l) => l.carousel_id)}
        />
      </div>
    </div>
  );
}
