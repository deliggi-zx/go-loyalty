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

const COURT_TYPE_LABELS: Record<string, string> = {
  f5: "Fútbol 5",
  f7: "Fútbol 7",
  f11: "Fútbol 11",
};

export interface NextReservationCourt {
  name: string;
  courtTypeLabel: string;
  photoUrl: string | null;
}

// Fase 3: "Tu próxima reserva" muestra una cancha real (nombre/tipo/foto)
// en cuanto exista al menos una cargada en gym_courts — la fecha/hora
// siguen siendo mock (la reserva en sí sigue sin ser real, eso es Fase 4).
// null si todavía no se cargó ninguna cancha, y corner-home.tsx cae al
// mock completo de siempre.
export async function getCornerNextReservationCourt(orgId: string): Promise<NextReservationCourt | null> {
  const supabase = createClient();

  const { data: court } = await supabase
    .from("gym_courts")
    .select("name, court_type, photo_url")
    .eq("org_id", orgId)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!court) return null;

  return {
    name: court.name,
    courtTypeLabel: COURT_TYPE_LABELS[court.court_type] ?? court.court_type,
    photoUrl: court.photo_url,
  };
}

export interface CornerCourt {
  id: string;
  name: string;
  courtTypeLabel: string;
}

// Fase 4: listado completo de canchas reales (gym_courts, ya cargado en
// Fase 3) para el paso 1 del modal de reserva — a diferencia de
// getCornerNextReservationCourt (que trae solo 1, para la card mock de la
// home), acá van todas para que el socio elija. Se pide una sola vez en
// layout.tsx y se pasa a CornerReserveProvider, que la reparte al modal.
export async function getCornerCourts(orgId: string): Promise<CornerCourt[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("gym_courts")
    .select("id, name, court_type")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    courtTypeLabel: COURT_TYPE_LABELS[c.court_type] ?? c.court_type,
  }));
}
