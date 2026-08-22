"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendReservationRequestEmail } from "@/lib/resend";

export interface CreatePropertyReservationInput {
  productId: string;
  phone: string;
}

export type CreatePropertyReservationResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid" | "already_reserved" };

// Fase Reservas (Domus): "Reservar" desde la ficha de una propiedad
// disponible — mismo espíritu que createPropertyVisit (domus-visits-
// actions.ts), pero sin fecha/hora: es solo "avisame que la quiero".
// El índice único parcial en DB (domus_property_reservations_product_
// active_unique) es la protección real contra reservar dos veces la
// misma propiedad a la vez; el chequeo de isProductReserved en la
// página solo evita ofrecer el botón en el camino feliz.
export async function createPropertyReservation(
  slug: string,
  orgId: string,
  input: CreatePropertyReservationInput
): Promise<CreatePropertyReservationResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const trimmedPhone = input.phone.trim();
  if (!trimmedPhone) return { ok: false, error: "invalid" };

  // La propiedad tiene que ser real y de esta org — mismo espíritu que
  // el .eq("org_id", orgId) de getProductDetail en data.ts.
  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", input.productId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!product) return { ok: false, error: "invalid" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("domus_property_reservations").insert({
    org_id: orgId,
    product_id: input.productId,
    client_profile_id: user.id,
    phone: trimmedPhone,
  });

  if (error) {
    // 23505 = unique_violation — alguien más reservó esta propiedad en la
    // ventana de carrera entre que se mostró el botón y esta llamada.
    if (error.code === "23505") return { ok: false, error: "already_reserved" };
    throw new Error(error.message);
  }

  // Mail real al agente (ver lib/resend.ts para la limitación de mandar
  // siempre al mail fijo, sin dominio verificado) — no bloquea la
  // reserva ya guardada si Resend falla.
  await sendReservationRequestEmail({
    propertyName: product.name,
    clientName: profile?.full_name ?? "—",
    clientPhone: trimmedPhone,
  }).catch((err) => {
    console.error("No se pudo mandar el mail de reserva:", err);
  });

  revalidatePath(`/${slug}/producto/${input.productId}`);
  revalidatePath(`/${slug}/precios`);
  revalidatePath("/dashboard/reservas");

  return { ok: true };
}
