import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { StampCard } from "./stamp-card";
import { Carousel } from "./carousel";

export default async function TenantPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select(
      "id, name, banner_url, background_url, background_color, primary_color, secondary_color, accent_color"
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
  const priceItems = content?.filter((c) => c.type === "price_list") ?? [];

  // Group price list by category
  const priceByCategory = priceItems.reduce<
    Record<string, typeof priceItems>
  >((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Stamp count for logged-in user
  let stampCount = 0;
  if (user) {
    const { data: pts } = await supabase
      .from("loyalty_user_points")
      .select("points")
      .eq("profile_id", user.id)
      .eq("org_id", org.id)
      .maybeSingle();
    stampCount = pts?.points ?? 0;
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

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Stamp card or login */}
        {user ? (
          <StampCard
            profileId={user.id}
            stampCount={stampCount}
            orgName={org.name}
            primaryColor={primary}
          />
        ) : (
          <LoginForm primaryColor={primary} />
        )}

        {/* Carousel */}
        {carouselItems.length > 0 && <Carousel items={carouselItems} />}

        {/* Price list */}
        {priceItems.length > 0 && (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Carta de precios</h2>
            </div>
            {Object.entries(priceByCategory).map(([category, items]) => (
              <div key={category}>
                <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-100">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    {category}
                  </p>
                </div>
                <div className="divide-y divide-stone-50">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <p className="text-sm text-stone-800">{item.title}</p>
                      {item.price != null && (
                        <p className="text-sm font-semibold text-stone-900 ml-4 shrink-0 tabular-nums">
                          ${item.price.toLocaleString("es-AR")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 pb-4">
          Programa de fidelización por{" "}
          <span className="font-medium" style={{ color: primary }}>
            Go Loyalty
          </span>
        </p>
      </div>
    </div>
  );
}
