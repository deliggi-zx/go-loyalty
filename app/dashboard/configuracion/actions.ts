"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// ── Apariencia ────────────────────────────────────────────────────────────────

export async function updateOrgAppearance(data: {
  banner_url?: string | null;
  background_url?: string | null;
  background_color?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // Remove undefined keys so we don't accidentally null out fields
  const payload = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  await supabase
    .from("loyalty_organizations")
    .update(payload)
    .eq("id", orgId);

  revalidatePath("/dashboard/configuracion");
}

// ── Carrusel ──────────────────────────────────────────────────────────────────

export async function addCarouselItem(
  imageUrl: string,
  title: string,
  sortOrder: number
) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase.from("loyalty_content").insert({
    org_id: orgId,
    type: "carousel",
    image_url: imageUrl,
    title: title || null,
    sort_order: sortOrder,
    is_active: true,
  });

  revalidatePath("/dashboard/configuracion");
}

export async function deleteContentItem(id: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // Verify ownership before deleting
  await supabase
    .from("loyalty_content")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/configuracion");
}

export async function updateCarouselOrder(
  items: { id: string; sort_order: number }[]
) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await Promise.all(
    items.map((item) =>
      supabase
        .from("loyalty_content")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("org_id", orgId)
    )
  );

  revalidatePath("/dashboard/configuracion");
}

// ── Lista de precios ──────────────────────────────────────────────────────────

export async function addPriceItem(data: {
  title: string;
  price: number | null;
  category: string;
}) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase.from("loyalty_content").insert({
    org_id: orgId,
    type: "price_list",
    title: data.title,
    price: data.price,
    category: data.category || "General",
    is_active: true,
    sort_order: 0,
  });

  revalidatePath("/dashboard/configuracion");
}

export async function updatePriceItem(
  id: string,
  data: { title: string; price: number | null; category: string }
) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase
    .from("loyalty_content")
    .update({
      title: data.title,
      price: data.price,
      category: data.category || "General",
    })
    .eq("id", id)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/configuracion");
}
