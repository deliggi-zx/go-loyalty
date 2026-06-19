import { createClient } from "@/lib/supabase/server";

export async function getOrgId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("loyalty_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  return data?.org_id ?? null;
}
