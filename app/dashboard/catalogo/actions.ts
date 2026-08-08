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

export async function createCategory(name: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const { data: last } = await supabase
    .from("product_categories")
    .select("display_order")
    .eq("org_id", orgId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = last && last.length > 0 ? last[0].display_order + 1 : 0;

  await supabase.from("product_categories").insert({
    org_id: orgId,
    name,
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
  category_id: string | null;
  active: boolean;
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
      category_id: data.category_id,
      active: data.active,
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
      category_id: data.category_id,
      active: data.active,
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

export async function addProductImage(
  productId: string,
  imageUrl: string,
  displayOrder: number
) {
  const supabase = createClient();
  const orgId = await requireOrgId();
  await requireOwnedProduct(productId, orgId);

  const { data: inserted, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, image_url: imageUrl, display_order: displayOrder })
    .select("id, image_url, display_order")
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
