"use server";

import { createClient } from "@/lib/supabase/server";

export async function claimEarnTransaction(qrToken: string): Promise<number> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debés iniciar sesión para reclamar los puntos");

  const nowIso = new Date().toISOString();

  const { data: claimed, error: claimError } = await supabase
    .from("loyalty_transactions")
    .update({ status: "claimed", profile_id: user.id, claimed_at: nowIso })
    .eq("qr_token", qrToken)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .select()
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);

  if (!claimed) {
    const { data: existing } = await supabase
      .from("loyalty_transactions")
      .select("status, expires_at")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (!existing) throw new Error("El código QR no existe o ya no es válido");
    if (existing.status === "claimed")
      throw new Error("Este código QR ya fue utilizado");
    if (existing.expires_at && new Date(existing.expires_at) <= new Date())
      throw new Error("El código QR expiró, pedí uno nuevo");
    throw new Error("El código QR no es válido");
  }

  const { data: existingPoints } = await supabase
    .from("loyalty_user_points")
    .select("id, balance, total_earned")
    .eq("profile_id", user.id)
    .eq("org_id", claimed.org_id)
    .maybeSingle();

  if (existingPoints) {
    const { error: updateError } = await supabase
      .from("loyalty_user_points")
      .update({
        balance: (existingPoints.balance ?? 0) + claimed.amount,
        total_earned: (existingPoints.total_earned ?? 0) + claimed.amount,
      })
      .eq("id", existingPoints.id);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from("loyalty_user_points")
      .insert({
        profile_id: user.id,
        org_id: claimed.org_id,
        balance: claimed.amount,
        total_earned: claimed.amount,
      });
    if (insertError) throw new Error(insertError.message);
  }

  return claimed.amount;
}
