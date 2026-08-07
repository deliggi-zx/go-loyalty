"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

async function requireOrgId() {
  const orgId = await getOrgId();
  if (!orgId) throw new Error("No autorizado");
  return orgId;
}

// Promueve un socio (role='customer') a profesor dentro de esta misma org.
// No hay pantalla para crear profesores desde cero (Fase 0b-i): alcanza con
// poder ascender a alguien que ya se registró como socio.
export async function promoteToProfesor(profileId: string) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  // Solo se puede promover a alguien que ya es customer de esta org — evita
  // que se le pase cualquier profile_id arbitrario (ej. de otra org) y
  // termine con un role='profesor' sin membresía real acá.
  const { data: member } = await supabase
    .from("loyalty_members")
    .select("id")
    .eq("profile_id", profileId)
    .eq("org_id", orgId)
    .eq("role", "customer")
    .maybeSingle();
  if (!member) throw new Error("Ese socio no pertenece a esta organización");

  await supabase
    .from("loyalty_members")
    .update({ role: "profesor" })
    .eq("id", member.id);

  revalidatePath("/dashboard/profesores");
}

// Asigna (o desasigna, con profileId null) un profesor a un horario
// puntual de gym_class_schedule. Sin RLS en esta tabla (ver análisis de la
// Fase 0b-i) — la validación de "quién puede escribir esto" vive acá, en la
// capa de aplicación, mismo criterio que el resto del panel de admin.
export async function assignInstructor(scheduleId: string, profileId: string | null) {
  const supabase = createClient();
  const orgId = await requireOrgId();

  if (profileId) {
    // Solo se puede asignar a alguien con role='profesor' en esta misma
    // org — evita asignar un customer, un admin, o un profesor de otra org.
    const { data: member } = await supabase
      .from("loyalty_members")
      .select("id")
      .eq("profile_id", profileId)
      .eq("org_id", orgId)
      .eq("role", "profesor")
      .maybeSingle();
    if (!member) throw new Error("Ese profile no es profesor de esta organización");
  }

  await supabase
    .from("gym_class_schedule")
    .update({ instructor_id: profileId })
    .eq("id", scheduleId)
    .eq("org_id", orgId);

  revalidatePath("/dashboard/profesores");
}
