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
  member_tier_label?: string | null;
  next_reward_threshold?: number | null;
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

export async function updateContentOrder(
  items: { id: string; sort_order: number }[],
  type: "carousel" | "price_list" | "promo"
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
        .eq("type", type)
    )
  );

  revalidatePath("/dashboard/configuracion");
}

// ── Lista de precios (flyers) ───────────────────────────────────────────────────

export async function addPriceListFlyer(imageUrl: string, sortOrder: number) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase.from("loyalty_content").insert({
    org_id: orgId,
    type: "price_list",
    image_url: imageUrl,
    title: null,
    category: null,
    price: null,
    sort_order: sortOrder,
    is_active: true,
  });

  revalidatePath("/dashboard/configuracion");
}

// ── Promos ────────────────────────────────────────────────────────────────────

export async function addPromoItem(imageUrl: string, sortOrder: number) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  await supabase.from("loyalty_content").insert({
    org_id: orgId,
    type: "promo",
    image_url: imageUrl,
    title: null,
    category: null,
    price: null,
    sort_order: sortOrder,
    is_active: true,
  });

  revalidatePath("/dashboard/configuracion");
}

// ── Contacto y redes ─────────────────────────────────────────────────────────

export async function updateOrgContact(data: {
  about_text?: string | null;
  whatsapp_number?: string | null;
  phone_number?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  terms_text?: string | null;
}) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const payload = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  await supabase.from("loyalty_organizations").update(payload).eq("id", orgId);

  revalidatePath("/dashboard/configuracion");
}

// ── Requisitos (Domus) ───────────────────────────────────────────────────────

// Fase Requisitos: columnas genéricas en loyalty_organizations (cualquier
// org podría tener datos acá), pero el form que llama a esto solo se
// renderiza para orgSlug === 'domus' (ver RequirementsForm/page.tsx) — no
// hace falta re-validar el slug acá, requireOrgId ya scopea al org del
// usuario logueado.
export async function updateOrgRequirements(data: {
  rental_requirements_text?: string | null;
  purchase_requirements_text?: string | null;
}) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  const payload = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  await supabase.from("loyalty_organizations").update(payload).eq("id", orgId);

  revalidatePath("/dashboard/configuracion");
}
