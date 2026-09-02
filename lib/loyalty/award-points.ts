import { createClient } from "@/lib/supabase/server";

interface AwardPointsArgs {
  orgId: string;
  profileId: string;
  amount: number;
  // loyalty_transactions.type — "signup_bonus" | "manual_*" (ver lib/loyalty/config.ts).
  type: string;
  note?: string | null;
  // Quién generó el movimiento: el admin en la carga manual, el propio
  // usuario en el bonus de registro.
  createdBy?: string | null;
}

// Acredita puntos: sube el balance en loyalty_user_points y deja el
// movimiento en loyalty_transactions (status default 'completed'). Centraliza
// el read-modify-write que hoy está duplicado en lib/loyalty/transactions.ts
// (ese sigue con su propio flujo de QR pendiente/claimed, no se toca acá).
//
// No es atómico (no hay RPC; el proyecto trabaja con la anon key) — el
// riesgo real es bajo: la carga manual la hace un admin de a una, y el bonus
// de registro es idempotente por el chequeo de "ya existe signup_bonus" en
// el caller.
export async function awardPoints({
  orgId,
  profileId,
  amount,
  type,
  note = null,
  createdBy = null,
}: AwardPointsArgs): Promise<void> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("loyalty_user_points")
    .select("id, balance, total_earned")
    .eq("profile_id", profileId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("loyalty_user_points")
      .update({
        balance: (existing.balance ?? 0) + amount,
        total_earned: (existing.total_earned ?? 0) + (amount > 0 ? amount : 0),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("loyalty_user_points").insert({
      profile_id: profileId,
      org_id: orgId,
      balance: amount,
      total_earned: amount > 0 ? amount : 0,
    });
    if (error) throw new Error(error.message);
  }

  const { error: txError } = await supabase.from("loyalty_transactions").insert({
    org_id: orgId,
    profile_id: profileId,
    amount,
    type,
    note,
    created_by: createdBy,
  });
  if (txError) throw new Error(txError.message);
}
