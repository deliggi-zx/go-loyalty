import { createClient } from "@/lib/supabase/server";
import { canDeleteVetReview } from "./vet-reviews-permissions";

// Fase 5 Huellitas, punto 4: "ver" es público, sin sesión — mismo
// criterio que getCommunityPets/getVetTips. canDelete ya viene resuelto
// acá (server), así el carrusel cliente no necesita saber quién es el
// usuario actual ni su role.
export interface VetReviewEntry {
  id: string;
  rating: number;
  comment: string;
  canDelete: boolean;
}

export async function getVetReviews(
  orgId: string,
  currentUserId: string | null,
  currentUserRole: string | null
): Promise<VetReviewEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vet_reviews")
    .select("id, profile_id, rating, comment")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    canDelete: canDeleteVetReview(r.profile_id, currentUserId, currentUserRole),
  }));
}
