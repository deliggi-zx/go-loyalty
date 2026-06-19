"use server";

import { createClient } from "@/lib/supabase/server";

export async function toggleRewardActive(
  rewardId: string,
  isActive: boolean
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("loyalty_rewards")
    .update({ is_active: isActive })
    .eq("id", rewardId);
}
