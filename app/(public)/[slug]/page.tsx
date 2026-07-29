import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser } from "./data";
import { LoginForm } from "./login-form";
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

  const primary = org.primary_color ?? "#f59e0b";

  return (
    <>
      {/* Login (solo si no hay sesión; si hay sesión, el badge de puntos ya se muestra en el layout) */}
      {!user && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <LoginForm primaryColor={primary} />
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Carousel principal */}
        {carouselItems.length > 0 && <Carousel items={carouselItems} />}

        {/* Promos, en columna */}
        {promoItems.length > 0 && (
          <div className="space-y-4">
            {promoItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden bg-stone-100"
                style={{ aspectRatio: "16 / 9" }}
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title ?? ""}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
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
