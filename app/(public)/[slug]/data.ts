import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getTenantOrg = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_organizations")
    .select(
      "id, name, banner_url, hero_video_url, background_url, background_color, primary_color, secondary_color, accent_color, member_tier_label, next_reward_threshold, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url, terms_text, catalog_type"
    )
    .eq("slug", slug)
    .maybeSingle();

  return data;
});

// Orgs de rubro Veterinaria con home bespoke propio (Fase 0, Huellitas) —
// config-driven por slug, nada atado a org_id. Se consulta desde más de un
// archivo (layout.tsx y page.tsx), por eso vive acá centralizado en vez de
// duplicar el Set en cada uno — mismo criterio que TICKER_PHRASES/
// VERTICAL_TABS/FLOATING_HEADER_SLUGS en layout.tsx, pero con un único
// origen de verdad. Sumar acá cualquier org nueva del rubro que quiera el
// mismo tratamiento (video full-screen, sin header/banner estándar en la
// home).
const VET_ORG_SLUGS = new Set(["huellitas"]);

export function isVetOrgSlug(slug: string): boolean {
  return VET_ORG_SLUGS.has(slug);
}

export const getTenantUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getUserPointsBalance = cache(async (orgId: string, userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_user_points")
    .select("balance")
    .eq("profile_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();

  return data?.balance ?? 0;
});

export interface CatalogImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  images: CatalogImage[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  display_order: number;
}

export const getProductCategories = cache(async (orgId: string): Promise<CatalogCategory[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name, display_order")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  return data ?? [];
});

export const getProductCatalog = cache(async (orgId: string): Promise<CatalogProduct[]> => {
  const supabase = createClient();
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, description, price, category_id, display_order")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("display_order", { ascending: true });

  const products = productsData ?? [];
  const productIds = products.map((p) => p.id);

  const { data: imagesData } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("id, product_id, image_url, display_order")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
      : { data: [] as { id: string; product_id: string; image_url: string; display_order: number }[] };

  const imagesByProduct = new Map<string, CatalogImage[]>();
  for (const img of imagesData ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push({ id: img.id, image_url: img.image_url, display_order: img.display_order });
    imagesByProduct.set(img.product_id, list);
  }

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category_id: p.category_id,
    images: imagesByProduct.get(p.id) ?? [],
  }));
});

export interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

// Productos marcados como destacados desde el admin (products.is_featured,
// ver toggleProductFeatured en dashboard/catalogo/actions.ts) — campo
// genérico, cualquier org con catalog_type='products' puede usarlo.
// Alimenta la grilla debajo de las promos en la sección "Imperdibles" (ver
// featured-products-grid.tsx). Si ningún producto está marcado, devuelve [].
export const getFeaturedProducts = cache(async (orgId: string): Promise<FeaturedProduct[]> => {
  const supabase = createClient();
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, price, display_order")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("is_featured", true)
    .order("display_order", { ascending: true });

  const products = productsData ?? [];
  const productIds = products.map((p) => p.id);

  const { data: imagesData } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("product_id, image_url, display_order")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
      : { data: [] as { product_id: string; image_url: string; display_order: number }[] };

  const mainImageByProduct = new Map<string, string>();
  for (const img of imagesData ?? []) {
    if (!mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.image_url);
    }
  }

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: mainImageByProduct.get(p.id) ?? null,
  }));
});
