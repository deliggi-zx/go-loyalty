"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canCreateVetReview, canDeleteVetReview } from "./vet-reviews-permissions";

async function getCurrentRole(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  userId: string
) {
  const { data } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export interface CreateVetReviewInput {
  rating: number;
  comment: string;
}

export async function createVetReview(slug: string, orgId: string, input: CreateVetReviewInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canCreateVetReview(role)) {
    throw new Error("No tenés permiso para dejar un comentario.");
  }

  const rating = Math.round(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Elegí una calificación de 1 a 5 estrellas.");
  }

  const comment = input.comment.trim();
  if (!comment) throw new Error("Escribí un comentario.");

  const { error } = await supabase.from("vet_reviews").insert({
    org_id: orgId,
    profile_id: user.id,
    rating,
    comment,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}`);
}

export async function deleteVetReview(slug: string, orgId: string, id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const { data: review } = await supabase
    .from("vet_reviews")
    .select("id, profile_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!review) throw new Error("No encontrado.");

  const role = await getCurrentRole(supabase, orgId, user.id);
  if (!canDeleteVetReview(review.profile_id, user.id, role)) {
    throw new Error("No tenés permiso para borrar este comentario.");
  }

  const { error } = await supabase.from("vet_reviews").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}`);
}
