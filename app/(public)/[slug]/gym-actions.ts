"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateTestimonial } from "@/lib/loyalty/testimonial-filter";

export interface SubmitTestimonialResult {
  ok: boolean;
  error?: string;
}

export async function submitTestimonial(
  orgId: string,
  slug: string,
  body: string,
  rating: number
): Promise<SubmitTestimonialResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Necesitás iniciar sesión para dejar una reseña." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Elegí un puntaje de 1 a 5 estrellas." };
  }

  const filter = moderateTestimonial(body);
  if (!filter.ok) {
    return { ok: false, error: filter.reason };
  }

  const { error } = await supabase.from("gym_testimonials").insert({
    org_id: orgId,
    profile_id: user.id,
    body: body.trim(),
    rating,
    status: "published",
  });

  if (error) {
    return { ok: false, error: "No pudimos publicar tu reseña. Intentá de nuevo." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
