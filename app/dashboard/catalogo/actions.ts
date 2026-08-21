"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

// ── Categorías ────────────────────────────────────────────────────────────

// Fase árbol: parentId opcional para crear una subcategoría real (mismo
// mecanismo que ya usan "Soportes y accesorios"/"Audio y Sonido" bajo
// "TV y Audio", hoy cargadas por SQL directo porque esta acción no
// aceptaba parent_id todavía). nextOrder queda scoped al padre (o a
// "sin padre" cuando parentId es null) — no un contador global de la
// org, mismo criterio que ya traían por SQL los hijos de "TV y Audio"
// (0..n dentro de cada rama en vez de continuar la secuencia de la
// raíz).
export async function createCategory(name: string, parentId: string | null = null) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  let query = supabase
    .from("product_categories")
    .select("display_order")
    .eq("org_id", orgId)
    .order("display_order", { ascending: false })
    .limit(1);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { data: last } = await query;

  const nextOrder = last && last.length > 0 ? last[0].display_order + 1 : 0;

  await supabase.from("product_categories").insert({
    org_id: orgId,
    name,
    parent_id: parentId,
    display_order: nextOrder,
  });

  revalidatePath("/dashboard/catalogo");
}

export async function updateCategoryName(id: string, name: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("product_categories")
    .update({ name })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
}

export async function updateCategoryOrder(
  items: { id: string; display_order: number }[]
) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await Promise.all(
    items.map((item) =>
      supabase
        .from("product_categories")
        .update({ display_order: item.display_order })
        .eq("id", item.id)
        .eq("org_id", orgId)
    )
  );

  revalidatePath("/dashboard/catalogo");
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // La FK category_id no tiene ON DELETE SET NULL — hay que desasignar
  // los productos antes de borrar la categoría para no romper el borrado.
  await supabase
    .from("products")
    .update({ category_id: null })
    .eq("category_id", id)
    .eq("org_id", orgId);

  // Mismo criterio para parent_id (Fase 1a SuperElectro): si esta
  // categoría tiene subcategorías (hoy solo pasa bajo "TV y Audio"),
  // desasignarlas antes de borrar para no romper el borrado por la FK.
  // No-op para el resto de las orgs, que no tienen categorías anidadas.
  await supabase
    .from("product_categories")
    .update({ parent_id: null })
    .eq("parent_id", id)
    .eq("org_id", orgId);

  await supabase
    .from("product_categories")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
}

// ── Productos ─────────────────────────────────────────────────────────────

export interface ProductInput {
  name: string;
  description: string | null;
  price: number;
  // Fase moneda: 'ARS' | 'USD' — ver migración add_currency_to_products.
  currency: string;
  category_id: string | null;
  active: boolean;
  brand: string | null;
  screen_size_inches: number | null;
  // Fase Home (sistema de carruseles configurables): tres campos 100%
  // cosméticos, sin ningún cálculo real detrás — solo se muestran en el
  // product-rail público si están cargados. Genérico, cualquier org con
  // catalog_type='products' puede usarlos.
  compare_at_price: number | null;
  installments_text: string | null;
  shipping_badge_text: string | null;
}

export async function createProduct(data: ProductInput): Promise<string> {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { data: last } = await supabase
    .from("products")
    .select("display_order")
    .eq("org_id", orgId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = last && last.length > 0 ? last[0].display_order + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      category_id: data.category_id,
      active: data.active,
      brand: data.brand,
      screen_size_inches: data.screen_size_inches,
      compare_at_price: data.compare_at_price,
      installments_text: data.installments_text,
      shipping_badge_text: data.shipping_badge_text,
      display_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/catalogo");
  return inserted.id;
}

export async function updateProduct(id: string, data: ProductInput) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("products")
    .update({
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      category_id: data.category_id,
      active: data.active,
      brand: data.brand,
      screen_size_inches: data.screen_size_inches,
      compare_at_price: data.compare_at_price,
      installments_text: data.installments_text,
      shipping_badge_text: data.shipping_badge_text,
    })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/dashboard/catalogo/productos/${id}`);
}

export async function toggleProductActive(id: string, active: boolean) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("products")
    .update({ active })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
}

// Estrellita de "destacado" — campo genérico (products.is_featured), no
// exclusivo de ninguna org. Alimenta la grilla de productos destacados en
// la sección "Imperdibles" del sitio público (ver featured-products-grid.tsx).
export async function toggleProductFeatured(id: string, featured: boolean) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("products")
    .update({ is_featured: featured })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!product) throw new Error("Producto no encontrado");

  const { data: images } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", id);

  const paths = (images ?? [])
    .map((img) => extractStoragePath(img.image_url, "product-images"))
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }

  // product_images se borra en cascada al borrar el producto
  await supabase.from("products").delete().eq("id", id).eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo");
}

// ── Imágenes de producto ─────────────────────────────────────────────────────

async function requireOwnedProduct(productId: string, orgId: string) {
  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!product) throw new Error("Producto no encontrado");
}

// Fase video (Domus): mediaType 'image' por default (mismo default que la
// columna) — cualquier caller existente que no lo pasa sigue insertando
// fotos exactamente igual que antes.
export async function addProductImage(
  productId: string,
  imageUrl: string,
  displayOrder: number,
  mediaType: "image" | "video" = "image"
) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  const { data: inserted, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: imageUrl,
      display_order: displayOrder,
      media_type: mediaType,
    })
    .select("id, image_url, display_order, media_type")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/catalogo/productos/${productId}`);
  revalidatePath("/dashboard/catalogo");

  return inserted;
}

export async function updateProductImageOrder(
  items: { id: string; display_order: number }[],
  productId: string
) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  await Promise.all(
    items.map((item) =>
      supabase
        .from("product_images")
        .update({ display_order: item.display_order })
        .eq("id", item.id)
        .eq("product_id", productId)
    )
  );

  revalidatePath(`/dashboard/catalogo/productos/${productId}`);
  revalidatePath("/dashboard/catalogo");
}

export async function deleteProductImage(imageId: string, productId: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  const { data: image } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (image?.image_url) {
    const path = extractStoragePath(image.image_url, "product-images");
    if (path) await supabase.storage.from("product-images").remove([path]);
  }

  await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  revalidatePath(`/dashboard/catalogo/productos/${productId}`);
  revalidatePath("/dashboard/catalogo");
}

// ── Specs de producto ────────────────────────────────────────────────────

// Fase 3: guarda el objeto completo de specs (clave-valor libre) de una.
// Genérico — cualquier org con catalog_type='products' puede usarlo, no
// solo SuperElectro. Se reemplaza entero en vez de hacer merge parcial
// porque el editor del admin ya maneja el objeto completo en memoria
// (agregar/borrar fila), mismo criterio que updateCategoryOrder.
export async function updateProductSpecs(productId: string, specs: Record<string, string>) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  await supabase
    .from("products")
    .update({ specs: Object.keys(specs).length > 0 ? specs : null })
    .eq("id", productId)
    .eq("org_id", orgId);

  revalidatePath(`/dashboard/catalogo/productos/${productId}`);
}

// ── Carruseles de producto (Fase Home) ──────────────────────────────────
//
// Infraestructura genérica para que cualquier org con catalog_type=
// 'products' arme sus propios estantes de productos en la home (título
// libre, orden, activo/inactivo) sin pedir código nuevo cada vez —
// independiente de products.is_featured (esa sigue siendo la fuente de
// "Imperdibles", sin tocar acá).

export async function createCarousel(title: string): Promise<string> {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { data: last } = await supabase
    .from("catalog_carousels")
    .select("display_order")
    .eq("org_id", orgId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = last && last.length > 0 ? last[0].display_order + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("catalog_carousels")
    .insert({ org_id: orgId, title, display_order: nextOrder, active: true })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/catalogo/carruseles");
  revalidatePath("/dashboard/catalogo");
  return inserted.id;
}

export async function updateCarouselTitle(id: string, title: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("catalog_carousels")
    .update({ title })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo/carruseles");
}

export async function updateCarouselOrder(
  items: { id: string; display_order: number }[]
) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await Promise.all(
    items.map((item) =>
      supabase
        .from("catalog_carousels")
        .update({ display_order: item.display_order })
        .eq("id", item.id)
        .eq("org_id", orgId)
    )
  );

  revalidatePath("/dashboard/catalogo/carruseles");
}

export async function toggleCarouselActive(id: string, active: boolean) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("catalog_carousels")
    .update({ active })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo/carruseles");
  revalidatePath("/dashboard/catalogo");
}

// Fase autoplay: default false a nivel columna (ver migración), así que
// activarlo es una decisión explícita de Die carrusel por carrusel — no
// cambia el comportamiento de los que ya existen (Destacados, Ofertas de
// la semana) hasta que los prenda a mano acá.
export async function toggleCarouselAutoplay(id: string, autoplay: boolean) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("catalog_carousels")
    .update({ autoplay })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo/carruseles");
  revalidatePath("/dashboard/catalogo");
}

export async function deleteCarousel(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // catalog_carousel_products se borra en cascada (FK on delete cascade)
  // — no hace falta desasignar productos a mano antes, a diferencia de
  // deleteCategory con product_categories (esa FK no tiene cascade).
  await supabase.from("catalog_carousels").delete().eq("id", id).eq("org_id", orgId);

  revalidatePath("/dashboard/catalogo/carruseles");
  revalidatePath("/dashboard/catalogo");
}

// Reemplaza entera la lista de carruseles en los que aparece un producto
// — mismo criterio que updateProductSpecs (el checklist del admin ya
// maneja el estado completo en memoria). Se valida carouselIds contra los
// carruseles reales de la org antes de insertar, para no poder asignar a
// un carrusel ajeno si alguien manipula el payload desde el cliente.
export async function updateProductCarousels(productId: string, carouselIds: string[]) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  const { data: orgCarousels } = await supabase
    .from("catalog_carousels")
    .select("id")
    .eq("org_id", orgId);
  const validIds = new Set((orgCarousels ?? []).map((c) => c.id));
  const safeIds = carouselIds.filter((id) => validIds.has(id));

  await supabase.from("catalog_carousel_products").delete().eq("product_id", productId);

  if (safeIds.length > 0) {
    await supabase.from("catalog_carousel_products").insert(
      safeIds.map((carousel_id, i) => ({ carousel_id, product_id: productId, display_order: i }))
    );
  }

  revalidatePath(`/dashboard/catalogo/productos/${productId}`);
  revalidatePath("/dashboard/catalogo/carruseles");
}
