import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getUserPointsBalance, getProductCategories } from "./data";
import { ClientHeader } from "./client-header";
import { PointsBadge } from "./points-badge";
import { CartProvider } from "./cart-context";
import { WhatsAppButton } from "./whatsapp-button";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return notFound();

  const user = await getTenantUser();

  const productCategories =
    org.catalog_type === "products" ? await getProductCategories(org.id) : [];

  let userDisplayName: string | null = null;
  let transactions: { id: string; amount: number; claimed_at: string | null }[] = [];
  let pointsBalance = 0;

  if (user) {
    const supabase = createClient();
    const [{ data: profile }, { data: txs }, balance] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("loyalty_transactions")
        .select("id, amount, claimed_at")
        .eq("profile_id", user.id)
        .eq("org_id", org.id)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false }),
      getUserPointsBalance(org.id, user.id),
    ]);

    userDisplayName = profile?.full_name || user.email?.split("@")[0] || null;
    transactions = txs ?? [];
    pointsBalance = balance;
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
    <CartProvider key={org.id}>
      <div className="min-h-screen" style={bodyStyle}>
        <ClientHeader
          orgName={org.name}
          primaryColor={primary}
          userDisplayName={user ? userDisplayName : null}
          catalogType={org.catalog_type}
          menuProps={{
            slug: params.slug,
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
            catalogType: org.catalog_type,
            productCategories,
          }}
        />

        {user && (
          <PointsBadge
            tierLabel={org.member_tier_label ?? "Socio Frecuente"}
            balance={pointsBalance}
          />
        )}

        {/* Banner */}
        {org.banner_url ? (
          <div className="w-full h-48 sm:h-64 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={org.banner_url}
              alt={org.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-full h-48 sm:h-64 flex items-center justify-center"
            style={{ backgroundColor: primary }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
              {org.name}
            </h1>
          </div>
        )}

        {children}

        <WhatsAppButton whatsappNumber={org.whatsapp_number} />
      </div>
    </CartProvider>
  );
}
