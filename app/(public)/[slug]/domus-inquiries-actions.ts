"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fase 2b Domus: consulta general del cliente ("busco algo puntual, no
// una propiedad concreta") — queda anotada en domus_general_inquiries,
// mismo cajón de Consultas del agente. Mismo criterio de auth-check
// dentro de la propia acción que createPropertyVisit (Fase 1): la UI ya
// oculta el form si no hay sesión, pero no hay que confiar en eso.
export type CreateGeneralInquiryResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid" };

export async function createGeneralInquiry(
  slug: string,
  orgId: string,
  message: string,
  phone: string
): Promise<CreateGeneralInquiryResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const trimmed = message.trim();
  // Dato suelto por formulario (columna nueva en domus_general_inquiries,
  // no en profiles — ver migración add_phone_to_domus_forms): requerido
  // acá, no hay de dónde completarlo solo si falta.
  const trimmedPhone = phone.trim();
  if (!trimmed || !trimmedPhone) return { ok: false, error: "invalid" };

  const { error } = await supabase.from("domus_general_inquiries").insert({
    org_id: orgId,
    client_profile_id: user.id,
    message: trimmed,
    phone: trimmedPhone,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/${slug}`);
  revalidatePath("/dashboard/consultas");

  return { ok: true };
}
