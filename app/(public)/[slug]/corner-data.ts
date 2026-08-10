import { createClient } from "@/lib/supabase/server";

// Ver AJUSTE 1 (ajuste fino sobre Corner Fase 2) para la regla completa.
// "category": profesor/admin, o cualquier socio ya asignado a una clase
// real — muestra la categoría de esa clase. "ladder": socio (customer)
// que alquila cancha pero no toma clases — escalera fija. "default": sin
// sesión, cosmético de siempre.
export type LevelCard =
  | { mode: "category"; label: string }
  | { mode: "ladder"; rung: string };

// Escalera del socio que alquila cancha (dato fijo, sin lógica real de
// qué lo mueve — pedido explícito). Lautaro (alumno-corner@gmail.com) es
// el ejemplo de demo dado; cualquier otro customer sin clase asignada
// cae al default "Amateur".
const LADDER_BY_PROFILE_ID: Record<string, string> = {
  "55ef37c7-c0ff-4a05-9cef-34e25801aa0a": "Semi-Pro", // Lautaro
};
const DEFAULT_LADDER_RUNG = "Amateur";

// Label default cuando el rol da category pero todavía no hay ninguna
// clase real cargada en Corner (hoy: ninguna, Fase 5 trae age_category).
const DEFAULT_CATEGORY_LABEL = "Formación";

export async function getCornerLevelCard(orgId: string, profileId: string): Promise<LevelCard> {
  const supabase = createClient();

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", profileId)
    .maybeSingle();

  const role = membership?.role ?? "customer";

  // profesor/admin: mostrar la categoría de la clase que dan, si ya
  // tienen alguna asignada como instructor (gym_class_schedule.
  // instructor_id) — si no, default fijo.
  if (role === "profesor" || role === "admin") {
    const { data: taught } = await supabase
      .from("gym_class_schedule")
      .select("gym_classes(category)")
      .eq("org_id", orgId)
      .eq("instructor_id", profileId)
      .limit(1)
      .maybeSingle();

    // Supabase tipa la relación anidada como array aunque acá siempre sea
    // a lo sumo 1 (join simple por instructor_id) — de ahí el [0].
    const taughtClasses = (taught?.gym_classes ?? []) as { category: string | null }[];
    const taughtCategory = taughtClasses[0]?.category;
    return { mode: "category", label: taughtCategory || DEFAULT_CATEGORY_LABEL };
  }

  // customer: si ya está anotado en alguna clase real (gym_member_classes
  // → gym_class_schedule → gym_classes), mostrar esa categoría en vez de
  // la escalera — "alquila cancha, no toma clases" deja de aplicar en
  // cuanto sí toma una.
  const { data: enrolled } = await supabase
    .from("gym_member_classes")
    .select("gym_class_schedule(gym_classes(category))")
    .eq("org_id", orgId)
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  // Mismo motivo que arriba: Supabase tipa las dos relaciones anidadas
  // como array, aunque acá también sea a lo sumo 1 de cada una.
  const enrolledSchedules = (enrolled?.gym_class_schedule ?? []) as {
    gym_classes: { category: string | null }[] | null;
  }[];
  const enrolledCategory = enrolledSchedules[0]?.gym_classes?.[0]?.category;

  if (enrolledCategory) {
    return { mode: "category", label: enrolledCategory };
  }

  return { mode: "ladder", rung: LADDER_BY_PROFILE_ID[profileId] ?? DEFAULT_LADDER_RUNG };
}
