import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { PointsPanel } from "./points-panel";
import { Carousel } from "./carousel";
import { PriceFlyers } from "./price-flyers";
import { ClientHeader } from "./client-header";
import { SocialLinks } from "./social-links";

export default async function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select(
      "id, name, banner_url, background_url, background_color, primary_color, secondary_color, accent_color, about_text, whatsapp_number, phone_number, facebook_url, instagram_url, twitter_url, youtube_url, terms_text"
    )
    .eq("slug", params.slug)
    .maybeSingle();

  if (!org) return notFound();

  const [{ data: content }, { data: authData }] = await Promise.all([
    supabase
      .from("loyalty_content")
      .select("id, type, title, price, category, image_url, sort_order")
      .eq("org_id", org.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const user = authData?.user ?? null;
  const carouselItems = content?.filter((c) => c.type === "carousel") ?? [];
  const promoItems = content?.filter((c) => c.type === "promo") ?? [];
  const priceFlyers = content?.filter((c) => c.type === "price_list") ?? [];

  let pointsBalance = 0;
  let userDisplayName: string | null = null;
  let transactions: { id: string; amount: number; claimed_at: string | null }[] = [];

  if (user) {
    const [{ data: pts }, { data: profile }, { data: txs }] = await Promise.all([
      supabase
        .from("loyalty_user_points")
        .select("balance")
        .eq("profile_id", user.id)
        .eq("org_id", org.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("loyalty_transactions")
        .select("id, amount, claimed_at")
        .eq("profile_id", user.id)
        .eq("org_id", org.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false }),
    ]);

    pointsBalance = pts?.balance ?? 0;
    userDisplayName = profile?.full_name || user.email?.split("@")[0] || null;
    transactions = txs ?? [];
  }

  const primary = org.primary_color ?? "#f59e0b";

  const bodyStyle: React.CSSProperties = org.background_url
    ? {
        backgroundImage: `url(${org.background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : org.background_color
    ? { backgroundColor: org.background_color }
    : { backgroundColor: "#fafaf9" };

  return (
    <div className="min-h-screen" style={bodyStyle}>
      <ClientHeader
        orgName={org.name}
        primaryColor={primary}
        userDisplayName={user ? userDisplayName : null}
        menuProps={{
          orgName: org.name,
          isLoggedIn: !!user,
          userName: userDisplayName,
          userEmail: user?.email ?? null,
          transactions,
          aboutText: org.about_text,
          phoneNumber: org.phone_number,
          whatsappNumber: org.whatsapp_number,
          facebookUrl: org.facebook_url,
          instagramUrl: org.instagram_url,
          twitterUrl: org.twitter_url,
          youtubeUrl: org.youtube_url,
          termsText: org.terms_text,
          primaryColor: primary,
        }}
      />

      {/* Points strip or login */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {user ? (
          <PointsPanel orgName={org.name} balance={pointsBalance} primaryColor={primary} />
        ) : (
          <LoginForm primaryColor={primary} />
        )}
      </div>

      {/* Banner */}
      {org.banner_url ? (
        <div className="w-full h-48 sm:h-64 overflow-hidden mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org.banner_url}
            alt={org.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="w-full h-48 sm:h-64 flex items-center justify-center mt-6"
          style={{ backgroundColor: primary }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
            {org.name}
          </h1>
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Carousel principal */}
        {carouselItems.length > 0 && <Carousel items={carouselItems} />}

        {/* Promos */}
        {promoItems.length > 0 && <Carousel items={promoItems} />}
      </div>

      {/* Flyers de precios */}
      {priceFlyers.length > 0 && <PriceFlyers items={priceFlyers} />}

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
    </div>
  );
}
