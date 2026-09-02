"use server";

import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/loyalty/award-points";

// Bonus de puntos por registrarse como cliente de una org. Lo llama
// LoginForm después de crear la cuenta (desde /[slug]/bienvenida o desde el
// modal del header — da igual por dónde vino). Idempotente: si ya hay un
// movimiento signup_bonus para este profile+org, no hace nada.
//
// Devuelve el monto acreditado (0 si la org no tiene bonus configurado o si
// ya se había acreditado antes) para que el form arme el copy de éxito.
export async function awardSignupBonus(orgId: string): Promise<number> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  // Tiene que ser miembro (customer) de esta org.
  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (membership?.role !== "customer") return 0;

  // Ya acreditado antes → no duplicar.
  const { data: existingBonus } = await supabase
    .from("loyalty_transactions")
    .select("id")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .eq("type", "signup_bonus")
    .maybeSingle();
  if (existingBonus) return 0;

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("signup_bonus_points")
    .eq("id", orgId)
    .maybeSingle();

  const bonus = org?.signup_bonus_points ?? 0;
  if (bonus <= 0) return 0;

  try {
    await awardPoints({
      orgId,
      profileId: user.id,
      amount: bonus,
      type: "signup_bonus",
      note: "Bonus de bienvenida",
      createdBy: user.id,
    });
  } catch (err) {
    console.error("[loyalty] awardSignupBonus falló:", err);
    return 0;
  }

  return bonus;
}

// Registro informativo de ingreso al sitio logueado (no suma puntos). Lo
// llama <VisitTracker> una vez por día (throttle en el cliente); acá se
// vuelve a chequear server-side que no haya una visita de hoy antes de
// insertar.
export async function recordVisit(orgId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (membership?.role !== "customer") return;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: todayVisit } = await supabase
    .from("loyalty_visits")
    .select("id")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .gte("visited_at", startOfToday.toISOString())
    .maybeSingle();
  if (todayVisit) return;

  const { error } = await supabase.from("loyalty_visits").insert({
    org_id: orgId,
    profile_id: user.id,
  });
  if (error) console.error("[loyalty] recordVisit falló:", error.message);
}
