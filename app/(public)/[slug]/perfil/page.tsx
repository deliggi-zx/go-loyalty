import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getUserPointsBalance, getOrgRole, isVetOrgSlug } from "../data";
import { getGymLocations, getGymClasses } from "../gym-data";
import { getOwnerPets } from "../vet-pets-data";
import { getVetReviews } from "../vet-reviews-data";
import { PointsPanel } from "../points-panel";
import { GymProfileHeader } from "../gym-profile-header";
import { GymQrAccess } from "../gym-qr-access";
import { GymWorkoutPlan } from "../gym-workout-plan";
import { GymGoalPicker } from "../gym-goal-picker";
import { GymFeaturedBanner } from "../gym-featured-banner";
import { GymRecommendedPopup } from "../gym-recommended-popup";
import { VetMyPets } from "../vet-my-pets";
import { VetReviewsSection } from "../vet-reviews-section";

export default async function PerfilPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  if (!user) redirect(`/${params.slug}`);

  const supabase = createClient();
  const [balance, { data: txs }, { data: profile }, gymLocations] = await Promise.all([
    getUserPointsBalance(org.id, user.id),
    supabase
      .from("loyalty_transactions")
      .select("id, amount, purchase_amount, claimed_at")
      .eq("profile_id", user.id)
      .eq("org_id", org.id)
      .eq("status", "claimed")
      .order("claimed_at", { ascending: false }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getGymLocations(org.id),
  ]);

  const transactions = txs ?? [];
  const primary = org.primary_color ?? "#f59e0b";
  const threshold = org.next_reward_threshold ?? 1000;
  const progressPct = Math.min(100, Math.round((balance / threshold) * 100));

  // Fase P4: puntos con estética oscuro+naranja — mismo criterio simple
  // (slug directo) que ya usa el saludo más abajo y page.tsx (isBike).
  const isBike = params.slug === "bike";

  // Showroom de entrenamiento (Fase 1 + 2): solo para Gym2, mismo criterio
  // hasGymFeatures que layout.tsx y page.tsx (orgs sin filas en
  // gym_locations no ven este bloque, todo lo demás sigue igual). Las
  // clases solo se piden si hace falta, para no sumarle una query más al
  // resto de las organizaciones.
  const hasGymFeatures = gymLocations.length > 0;
  const gymClasses = hasGymFeatures ? await getGymClasses(org.id) : [];

  // Mis Mascotas (Fase 1 Huellitas, punto 3): solo para orgs vet — mismo
  // helper isVetOrgSlug que gatea la home bespoke en layout.tsx/page.tsx,
  // acá no hay chrome propia que ocultar, solo un bloque más dentro del
  // perfil genérico (igual criterio que hasGymFeatures arriba).
  const hasVetFeatures = isVetOrgSlug(params.slug);
  const myPets = hasVetFeatures ? await getOwnerPets(org.id, user.id) : [];

  // Comentarios (Fase 5 Huellitas, punto 4, rev. 3): mismo gate
  // hasVetFeatures — canDelete por reseña se resuelve acá (getVetReviews),
  // no en el cliente, mismo criterio que getCommunityPets en Refugio/
  // Perdidos. user ya está garantizado no-null en esta página (redirect
  // arriba si no hay sesión), así que el role siempre se puede pedir.
  const vetRole = hasVetFeatures ? await getOrgRole(org.id, user.id) : null;
  const vetReviews = hasVetFeatures ? await getVetReviews(org.id, user.id, vetRole) : [];

  const userName = profile?.full_name || user.email?.split("@")[0] || "Socio";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  // Fase 4: QR de socio fijo (carnet de acceso) generado a partir del
  // user.id — todavía no hay lector del lado del gym, así que el
  // contenido no "significa" nada real por ahora. Server-side con el
  // paquete "qrcode" ya instalado (remanente del viejo stamp-card.tsx),
  // así el cliente no suma nada de JS para esto.
  const qrDataUrl = hasGymFeatures
    ? await QRCode.toDataURL(user.id, {
        width: 384,
        margin: 1,
        color: { dark: "#0a0a0b", light: "#ffffff" },
      })
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link
        href={`/${params.slug}`}
        className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        ‹ Volver
      </Link>

      {/* Saludo que antes vivía en el header — se sacó de ahí para "bike"
          (Fase 3c, header flotante transparente) y se movió acá. Scopeado
          al slug, no a "cualquier org sin gym_locations", para no cambiar
          el Mi Perfil de Cafetería/Bicicletería/Gym1 en esta fase. */}
      {params.slug === "bike" && (
        <p className="text-lg font-semibold text-stone-900">
          {greeting}, {userName}
        </p>
      )}

      {hasGymFeatures && (
        <GymFeaturedBanner photoUrl={gymLocations[0]?.photo_url ?? null} />
      )}

      {hasGymFeatures && <GymRecommendedPopup />}

      {hasGymFeatures && (
        <GymProfileHeader
          greeting={greeting}
          userName={userName}
          locations={gymLocations}
          classes={gymClasses}
        />
      )}

      {hasGymFeatures && qrDataUrl && (
        <GymQrAccess qrDataUrl={qrDataUrl} userName={userName} />
      )}

      {hasGymFeatures && <GymWorkoutPlan userName={userName} />}

      {hasGymFeatures && <GymGoalPicker />}

      {/* Mis Mascotas (punto 3, Fase 1 Huellitas) — bloque propio, separado
          del de puntos/historial de más abajo (pedido explícito). Vive acá
          arriba, junto con el resto de los bloques específicos de esta
          org, y no adentro del contenedor de PointsPanel. */}
      {hasVetFeatures && (
        <VetMyPets slug={params.slug} orgId={org.id} pets={myPets} primaryColor={primary} />
      )}

      {/* Comentarios (punto 4, Fase 5 Huellitas, rev. 3) — bloque propio,
          separado de Mis Mascotas y del de puntos/historial de más abajo,
          mismo criterio de "un bloque más" que el resto de esta página. */}
      {hasVetFeatures && (
        <VetReviewsSection slug={params.slug} orgId={org.id} primaryColor={primary} reviews={vetReviews} />
      )}

      <div className="flex justify-center">
        <div className="w-full max-w-sm space-y-4">
          <PointsPanel
            label={org.member_tier_label ?? "Socio Frecuente"}
            balance={balance}
            primaryColor={primary}
            bikeTheme={isBike}
          />

          {/* Barra de progreso — "bike" (Fase P4) suma el track oscuro y el
              relleno/texto en naranja, mismo acento que PointsPanel arriba.
              El resto de las orgs sigue con el track claro de siempre. */}
          <div
            className={
              isBike
                ? "bg-[#0a0a0b] rounded-2xl border border-[#26262a] p-4 space-y-2"
                : "space-y-2"
            }
          >
            <div
              className={`w-full h-2 rounded-full overflow-hidden ${
                isBike ? "bg-[#26262a]" : "bg-stone-200"
              }`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: isBike ? "#ff6b00" : primary }}
              />
            </div>
            <p className={`text-center text-xs ${isBike ? "text-[#9b9995]" : "text-stone-500"}`}>
              {balance >= threshold
                ? "¡Ya alcanzaste tu próxima recompensa!"
                : `Te faltan ${threshold - balance} puntos para tu próxima recompensa`}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de consumo */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Historial de consumo
        </h2>
        {transactions.length > 0 ? (
          <div className="bg-white divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-stone-500 text-xs shrink-0">
                  {tx.claimed_at
                    ? new Date(tx.claimed_at).toLocaleDateString("es-AR")
                    : "—"}
                </span>
                <span className="text-stone-600 flex-1 text-right">
                  {tx.purchase_amount != null
                    ? `$${tx.purchase_amount.toLocaleString("es-AR")}`
                    : ""}
                </span>
                <span className="font-medium text-stone-900 shrink-0">
                  +{tx.amount.toLocaleString("es-AR")} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400">Todavía no sumaste puntos.</p>
        )}
      </div>
    </div>
  );
}
