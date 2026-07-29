import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser } from "./data";
import { LoginForm } from "./login-form";
import { PointsPanel } from "./points-panel";
import { Carousel } from "./carousel";
import { SocialLinks } from "./social-links";

export default async function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const supabase = createClient();
  const user = await getTenantUser();

  const { data: content } = await supabase
    .from("loyalty_content")
    .select("id, type, title, price, category, image_url, sort_order")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .in("type", ["carousel", "promo"])
    .order("sort_order", { ascending: true });

  const carouselItems = content?.filter((c) => c.type === "carousel") ?? [];
  const promoItems = content?.filter((c) => c.type === "promo") ?? [];

  let pointsBalance = 0;
  if (user) {
    const { data: pts } = await supabase
      .from("loyalty_user_points")
      .select("balance")
      .eq("profile_id", user.id)
      .eq("org_id", org.id)
      .maybeSingle();
    pointsBalance = pts?.balance ?? 0;
  }

  const primary = org.primary_color ?? "#f59e0b";

  return (
    <>
      {/* Points strip or login */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {user ? (
          <PointsPanel orgName={org.name} balance={pointsBalance} primaryColor={primary} />
        ) : (
          <LoginForm primaryColor={primary} />
        )}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Carousel principal */}
        {carouselItems.length > 0 && <Carousel items={carouselItems} />}

        {/* Promos */}
        {promoItems.length > 0 && <Carousel items={promoItems} />}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 pb-8 pt-2 space-y-4">
        <SocialLinks
          facebookUrl={org.facebook_url}
          instagramUrl={org.instagram_url}
          twitterUrl={org.twitter_url}
          youtubeUrl={org.youtube_url}
          className="flex items-center justify-center gap-4"
        />
        <p className="text-center text-xs text-stone-400">
          Programa de fidelización por{" "}
          <span className="font-medium" style={{ color: primary }}>
            Go Loyalty
          </span>
        </p>
      </div>
    </>
  );
}
