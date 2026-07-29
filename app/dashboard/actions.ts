"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createEarnTransaction(
  orgId: string,
  purchaseAmount: number
): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const callerOrgId = await getOrgId();
  if (!callerOrgId || callerOrgId !== orgId) throw new Error("No autorizado");

  const { data: org, error: orgError } = await supabase
    .from("loyalty_organizations")
    .select("points_per_1000")
    .eq("id", orgId)
    .single();
  if (orgError || !org) throw new Error("Organización no encontrada");

  const pointsPer1000 = org.points_per_1000 ?? 50;
  const points = Math.floor((purchaseAmount / 1000) * pointsPer1000);
  const qrToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from("loyalty_transactions").insert({
    org_id: orgId,
    amount: points,
    purchase_amount: purchaseAmount,
    type: "earn",
    status: "pending",
    qr_token: qrToken,
    expires_at: expiresAt,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  return qrToken;
}
