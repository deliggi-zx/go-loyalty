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

// Showroom de fútbol 5/7/11 con home bespoke propio (Corner) — mismo
// criterio que VET_ORG_SLUGS: config-driven por slug, único origen de
// verdad para layout.tsx y page.tsx. A diferencia de Huellitas (que
// reemplaza TODA la chrome siempre), Corner solo reemplaza header/banner/
// hero-video en la home (ver CornerChromeGate) — el bottom nav nuevo vive
// en todas sus rutas, no solo ahí.
const CORNER_ORG_SLUGS = new Set(["corner"]);

export function isCornerOrgSlug(slug: string): boolean {
  return CORNER_ORG_SLUGS.has(slug);
}

export const getTenantUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

// Role del usuario actual DENTRO de esta org puntual (no un flag global) —
// mismo criterio que showMascotas/showTurnos en dashboard/layout.tsx, pero
// reusable desde cualquier página pública (Fase 4: Refugio/Perdidos lo
// necesitan para decidir permisos de carga/edición, ver
// vet-community-pets-permissions.ts). null si el usuario no es miembro de
// esta org (o no hay sesión — ahí ni se llama, ver los callers).
export const getOrgRole = cache(async (orgId: string, profileId: string): Promise<string | null> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", profileId)
    .maybeSingle();

  return data?.role ?? null;
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
  // Fase 1a/1c SuperElectro: brand adelantado desde lo que era Fase 2
  // (ahora requisito del filtro de "TV por marca"), screen_size_inches
  // nuevo (requisito de "TV por pulgadas"). Ambos null para el resto de
  // las orgs y para cualquier producto que no los tenga cargados.
  brand: string | null;
  screen_size_inches: number | null;
  images: CatalogImage[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  display_order: number;
  // Fase 1a SuperElectro: jerarquía de 2 niveles (grupo → subcategoría).
  // null para cualquier categoría de nivel superior — que es el 100% de
  // las categorías de todas las orgs salvo las hijas de "TV y Audio".
  parent_id: string | null;
  // Fase 1c SuperElectro: si está seteada, esta categoría no tiene hijas
  // reales — sus "hojas" se derivan en el cliente a partir del campo de
  // producto indicado ('brand' | 'screen_size_inches'), escaneando los
  // productos de su categoría padre. null para cualquier categoría con
  // hijas reales en la base o sin hijas.
  leaf_source: string | null;
}

export const getProductCategories = cache(async (orgId: string): Promise<CatalogCategory[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, name, display_order, parent_id, leaf_source")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  return data ?? [];
});

export const getProductCatalog = cache(async (orgId: string): Promise<CatalogProduct[]> => {
  const supabase = createClient();
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, description, price, category_id, brand, screen_size_inches, display_order")
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
    brand: p.brand,
    screen_size_inches: p.screen_size_inches,
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
