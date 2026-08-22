import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getTenantOrg = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_organizations")
    .select(
      "id, name, banner_url, hero_video_url, background_url, background_color, primary_color, secondary_color, accent_color, member_tier_label, next_reward_threshold, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url, terms_text, catalog_type, rental_requirements_text, purchase_requirements_text"
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
  // Fase video (Domus): 'image' | 'video' — mismo mecanismo de galería
  // (product_images) para los dos, mezclados por display_order. Default
  // 'image' a nivel columna, así que cualquier fila vieja ya viene con
  // este valor sin backfill. Ver ProductImageCarousel para cómo se
  // renderiza cada tipo.
  media_type: string;
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
  // Fase 4: solo para decidir si la card linkea a la ficha nueva
  // (/[slug]/producto/[id]) o sigue abriendo el modal de siempre — ver
  // hasProductDetail en product-detail-utils.ts. No se muestra en la
  // grilla.
  specs: Record<string, string> | null;
  // Fase moneda: 'ARS' | 'USD' (columna con default 'ARS', ver migración
  // add_currency_to_products) — determina el símbolo que arma
  // formatPrice() en lib/utils.ts. Genérico para cualquier org, no
  // exclusivo de Domus.
  currency: string;
  images: CatalogImage[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  display_order: number;
  // Fase 1a SuperElectro: jerarquía de categorías (grupo → subcategoría),
  // sin límite de profundidad — category-drilldown.tsx arma la cascada
  // con una pila (push/pop), no con 2 niveles hardcodeados; la Fase árbol
  // sumó un tercer nivel real bajo "Soportes y accesorios"/"Audio y
  // Sonido" sin tocar ese componente. null para cualquier categoría de
  // nivel superior — que es el 100% de las categorías de todas las orgs
  // salvo las hijas de "TV y Audio".
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
    .select(
      "id, name, description, price, category_id, brand, screen_size_inches, specs, currency, display_order"
    )
    .eq("org_id", orgId)
    .eq("active", true)
    .order("display_order", { ascending: true });

  const products = productsData ?? [];
  const productIds = products.map((p) => p.id);

  const { data: imagesData } =
    productIds.length > 0
      ? await supabase
          .from("product_images")
          .select("id, product_id, image_url, display_order, media_type")
          .in("product_id", productIds)
          .order("display_order", { ascending: true })
      : {
          data: [] as {
            id: string;
            product_id: string;
            image_url: string;
            display_order: number;
            media_type: string;
          }[],
        };

  const imagesByProduct = new Map<string, CatalogImage[]>();
  for (const img of imagesData ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push({
      id: img.id,
      image_url: img.image_url,
      display_order: img.display_order,
      media_type: img.media_type,
    });
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
    specs: (p.specs as Record<string, string> | null) ?? null,
    currency: p.currency,
    images: imagesByProduct.get(p.id) ?? [],
  }));
});

export interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  // Fase 4: mismo criterio que CatalogProduct.specs — ver hasProductDetail
  // en product-detail-utils.ts.
  specs: Record<string, string> | null;
  // Fase moneda: ver CatalogProduct.currency más arriba.
  currency: string;
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
    .select("id, name, price, specs, currency, display_order")
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

  // Fase video: esta grilla renderiza la portada con <img>, así que un
  // video en display_order 0 (Fase video, ver ProductImageCarousel para
  // la galería real) nunca puede quedar elegido acá — se salta hasta
  // encontrar la primera foto real del producto.
  const mainImageByProduct = new Map<string, string>();
  for (const img of imagesData ?? []) {
    if (img.media_type === "video") continue;
    if (!mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.image_url);
    }
  }

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: mainImageByProduct.get(p.id) ?? null,
    specs: (p.specs as Record<string, string> | null) ?? null,
    currency: p.currency,
  }));
});

// Fase 3: ficha de producto individual (/[slug]/producto/[id]). Genérico
// para cualquier org con catalog_type='products', no exclusivo de
// SuperElectro — cualquier producto de cualquier org puede tener `specs`
// y varias imágenes si se cargan. `specs` es un objeto clave-valor libre
// (JSONB en la base), null si el producto todavía no tiene ninguna
// cargada.
export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  brand: string | null;
  screen_size_inches: number | null;
  specs: Record<string, string> | null;
  // Fase moneda: ver CatalogProduct.currency más arriba.
  currency: string;
  // Fase Requisitos (Domus): se usa para inferir el tipo de operación
  // (venta/alquiler) subiendo hasta la categoría raíz del producto — ver
  // findRootAncestor en lib/category-tree.ts y su uso en producto/[id]/
  // page.tsx. null para cualquier producto sin categoría asignada.
  category_id: string | null;
  images: CatalogImage[];
}

// Mismo criterio que getGymLocations/sede/[locationId]: se filtra por
// org_id (nunca solo por id) para que un link a un producto de otra org
// no traiga datos ajenos, y por active=true para no exponer productos
// dados de baja vía URL directa — ambos casos caen en notFound() en la
// página, no acá.
// Fase Home: carruseles de producto configurables desde el admin (ver
// dashboard/catalogo/carruseles) — independiente de is_featured/
// FeaturedProduct de arriba, que sigue siendo la fuente de "Imperdibles"
// sin tocar. Genérico para cualquier org con catalog_type='products'.
export interface CarouselProductItem {
  id: string;
  name: string;
  price: number;
  // Cosméticos (ver ProductInput en dashboard/catalogo/actions.ts): sin
  // ningún cálculo real detrás, null si no se cargaron.
  compareAtPrice: number | null;
  installmentsText: string | null;
  shippingBadgeText: string | null;
  imageUrl: string | null;
  specs: Record<string, string> | null;
  // Fase moneda: ver CatalogProduct.currency más arriba.
  currency: string;
}

export interface ProductCarousel {
  id: string;
  title: string;
  products: CarouselProductItem[];
  // Fase autoplay: default false en la columna (ver migración
  // add_autoplay_to_catalog_carousels), así que sin cambios para los
  // carruseles existentes hasta que Die lo prenda a mano en el admin.
  autoplay: boolean;
}

// Solo carruseles activos, con solo productos activos adentro (un
// producto puede estar asignado a un carrusel activo pero seguir
// active=false mientras Die termina de cargarle los datos — ver Fase
// Home, seed del Philips 32"). Un carrusel que queda sin ningún producto
// visible (todos inactivos, o ninguno asignado) no se devuelve — el
// caller no tiene que preocuparse por estantes vacíos.
export const getActiveCarousels = cache(async (orgId: string): Promise<ProductCarousel[]> => {
  const supabase = createClient();
  const { data: carouselsData } = await supabase
    .from("catalog_carousels")
    .select("id, title, autoplay")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("display_order", { ascending: true });

  const carousels = carouselsData ?? [];
  if (carousels.length === 0) return [];

  const carouselIds = carousels.map((c) => c.id);
  const { data: linksData } = await supabase
    .from("catalog_carousel_products")
    .select("carousel_id, product_id, display_order")
    .in("carousel_id", carouselIds)
    .order("display_order", { ascending: true });

  const links = linksData ?? [];
  const productIds = Array.from(new Set(links.map((l) => l.product_id)));
  if (productIds.length === 0) return [];

  const { data: productsData } = await supabase
    .from("products")
    .select(
      "id, name, price, compare_at_price, installments_text, shipping_badge_text, specs, currency"
    )
    .in("id", productIds)
    .eq("org_id", orgId)
    .eq("active", true);

  const { data: imagesData } =
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

  // Fase video: mismo criterio que getFeaturedProducts — las cards de
  // carrusel renderizan con <img>, un video nunca puede quedar elegido
  // como portada.
  const mainImageByProduct = new Map<string, string>();
  for (const img of imagesData ?? []) {
    if (img.media_type === "video") continue;
    if (!mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.image_url);
    }
  }

  const productById = new Map((productsData ?? []).map((p) => [p.id, p]));

  return carousels
    .map((c) => {
      const products = links
        .filter((l) => l.carousel_id === c.id)
        .map((l) => productById.get(l.product_id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          compareAtPrice: p.compare_at_price,
          installmentsText: p.installments_text,
          shippingBadgeText: p.shipping_badge_text,
          imageUrl: mainImageByProduct.get(p.id) ?? null,
          specs: (p.specs as Record<string, string> | null) ?? null,
          currency: p.currency,
        }));
      return { id: c.id, title: c.title, products, autoplay: c.autoplay };
    })
    .filter((c) => c.products.length > 0);
});

export const getProductDetail = cache(
  async (orgId: string, productId: string): Promise<ProductDetail | null> => {
    const supabase = createClient();
    const { data: product } = await supabase
      .from("products")
      .select("id, name, description, price, brand, screen_size_inches, specs, currency, category_id")
      .eq("id", productId)
      .eq("org_id", orgId)
      .eq("active", true)
      .maybeSingle();

    if (!product) return null;

    const { data: imagesData } = await supabase
      .from("product_images")
      .select("id, image_url, display_order, media_type")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      brand: product.brand,
      screen_size_inches: product.screen_size_inches,
      specs: (product.specs as Record<string, string> | null) ?? null,
      currency: product.currency,
      category_id: product.category_id,
      images: imagesData ?? [],
    };
  }
);
