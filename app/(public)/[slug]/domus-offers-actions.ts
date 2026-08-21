"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fase 3 Domus: "ofrecer mi propiedad". Mismo criterio de auth-check
// dentro de la propia acción que createPropertyVisit/createGeneralInquiry
// (Fases 1/2) — /domus/perfil ya redirige si no hay sesión, pero no hay
// que confiar en eso acá tampoco.
export interface CreatePropertyOfferInput {
  phone: string;
  operationType: "venta" | "alquiler";
  propertyType: string;
  address: string;
  neighborhood: string;
  requestedPrice: number;
  currency: "ARS" | "USD";
  rooms: number | null;
  totalSurface: number | null;
  coveredSurface: number | null;
  amenities: string;
  // Fotos ya subidas a Storage por el propio form (mismo bucket
  // "product-images" que usa el catálogo, ver product-images-manager.tsx
  // — path distinto, "property-offers/...", no hace falta bucket nuevo).
  // Acá solo llegan las URLs públicas para persistir en
  // domus_property_offer_photos junto con la oferta recién creada.
  photoUrls: string[];
}

export type CreatePropertyOfferResult = { ok: true } | { ok: false; error: "unauthorized" | "invalid" };

export async function createPropertyOffer(
  slug: string,
  orgId: string,
  input: CreatePropertyOfferInput
): Promise<CreatePropertyOfferResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const phone = input.phone.trim();
  const address = input.address.trim();
  if (!phone || !address) return { ok: false, error: "invalid" };
  if (input.operationType !== "venta" && input.operationType !== "alquiler") {
    return { ok: false, error: "invalid" };
  }
  if (!Number.isFinite(input.requestedPrice) || input.requestedPrice <= 0) {
    return { ok: false, error: "invalid" };
  }

  const { data: offer, error } = await supabase
    .from("domus_property_offers")
    .insert({
      org_id: orgId,
      owner_profile_id: user.id,
      phone,
      operation_type: input.operationType,
      property_type: input.propertyType,
      address,
      neighborhood: input.neighborhood.trim() || null,
      requested_price: input.requestedPrice,
      currency: input.currency,
      rooms: input.rooms,
      total_surface: input.totalSurface,
      covered_surface: input.coveredSurface,
      amenities: input.amenities.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (input.photoUrls.length > 0) {
    await supabase.from("domus_property_offer_photos").insert(
      input.photoUrls.map((image_url, display_order) => ({
        offer_id: offer.id,
        image_url,
        display_order,
      }))
    );
  }

  revalidatePath(`/${slug}/perfil`);
  revalidatePath("/dashboard/ofertas");

  return { ok: true };
}
