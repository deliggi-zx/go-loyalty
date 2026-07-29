import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getTenantOrg = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_organizations")
    .select(
      "id, name, banner_url, background_url, background_color, primary_color, secondary_color, accent_color, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url, terms_text"
    )
    .eq("slug", slug)
    .maybeSingle();

  return data;
});

export const getTenantUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
