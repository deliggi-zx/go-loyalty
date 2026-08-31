import Link from "next/link";
import { Bike, Users, Wrench } from "lucide-react";
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
import { PropertyOfferForm } from "../property-offer-form";
import { GeneralInquiryForm } from "../general-inquiry-form";
import { MyVisitsList, type MyVisitRow } from "../my-visits-list";
import { todayLocalYmd } from "../vet-appointments-config";
import { formatPrice } from "@/lib/utils";
import { DomusAgentPanel } from "@/app/dashboard/inicio/domus-agent-panel";
import { getDomusAgentBadgeCounts } from "@/app/dashboard/inicio/domus-badge-counts";
import { getKapustaPanelData } from "@/app/dashboard/inicio/kapusta-panel-data";

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

  // Fase P5 Bike: "Mundo Bike" — resumen de admin en vez del panel de
  // cliente. Mismo helper getOrgRole (loyalty_members.role) que ya usan
  // domusRole/vetRole más abajo, acá recién se suma el gate para bike.
  const bikeRole = isBike ? await getOrgRole(org.id, user.id) : null;
  const isBikeAdmin = isBike && bikeRole === "admin";

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

  // Fase 3 Domus: "ofrecer mi propiedad" — mismo criterio simple (slug
  // directo) que isBike/hasVetFeatures de este archivo. Esta página ya
  // redirige arriba si !user, así que no hace falta gating adicional acá
  // (a diferencia de Visitas/Consultas, que viven en páginas públicas sin
  // login obligatorio).
  const isDomus = params.slug === "domus" || params.slug === "kapusta";
  const isKapusta = params.slug === "kapusta";

  // Fase perfil agente vs. cliente: reusa getOrgRole (ya importado arriba
  // para vetRole, mismo query que membership.role en dashboard/layout.tsx)
  // en vez de escribir un query nuevo. Solo Domus tiene esta rama — el
  // resto de las orgs no diferencia agente/cliente en Mi Perfil. Fase 1c
  // (rol agente): antes solo "admin" representaba a un agente — ahora
  // también el role "agente" ve el panel (el gerente sigue viendo TODO
  // en sus badges, un agente solo lo suyo, ver domusBadgeCounts abajo).
  const domusRole = isDomus ? await getOrgRole(org.id, user.id) : null;
  const isDomusManager = isDomus && domusRole === "admin";
  const isDomusAgent = isDomus && (domusRole === "admin" || domusRole === "agente");
  const isDomusCustomer = isDomus && !isDomusAgent;

  // Fase 5 Domus: "Mis consultas" / "Mis visitas" / "Mis propiedades
  // ofrecidas" — mismo criterio isDomusCustomer (antes isDomus a secas:
  // un agente viendo su propio perfil no tiene sentido que vea "sus"
  // consultas/visitas/ofertas como cliente, ve el resumen de abajo en su
  // lugar), tres queries scoped al profile_id/client_profile_id/
  // owner_profile_id de ESTE usuario (nunca toda la org, a diferencia de
  // los paneles del agente en /dashboard). Se piden en paralelo, no en
  // cascada.
  const [{ data: myInquiriesData }, { data: myVisitsData }, { data: myOffersData }] = isDomusCustomer
    ? await Promise.all([
        supabase
          .from("domus_general_inquiries")
          .select("id, message, status, created_at")
          .eq("org_id", org.id)
          .eq("client_profile_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("domus_property_visits")
          .select("id, product_id, visit_date, visit_time, status")
          .eq("org_id", org.id)
          .eq("client_profile_id", user.id)
          .order("visit_date", { ascending: false })
          .order("visit_time", { ascending: false }),
        supabase
          .from("domus_property_offers")
          .select(
            "id, operation_type, property_type, address, requested_price, currency, status, scheduled_at, created_at"
          )
          .eq("org_id", org.id)
          .eq("owner_profile_id", user.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const myInquiries = myInquiriesData ?? [];
  const myVisitsRaw = myVisitsData ?? [];
  const myOffers = myOffersData ?? [];

  const myVisitProductIds = Array.from(new Set(myVisitsRaw.map((v) => v.product_id)));
  const { data: myVisitProductsData } =
    isDomusCustomer && myVisitProductIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", myVisitProductIds)
      : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((myVisitProductsData ?? []).map((p) => [p.id, p.name]));

  const today = todayLocalYmd();
  const myVisits: MyVisitRow[] = myVisitsRaw.map((v) => ({
    id: v.id,
    propertyName: productNameById.get(v.product_id) ?? "—",
    date: v.visit_date,
    time: v.visit_time.slice(0, 5),
    status: v.status as MyVisitRow["status"],
    // Cancelable tanto pendiente (todavía esperando al agente) como
    // confirmada — rejected/cancelled ya están cerradas.
    canCancel: (v.status === "pending" || v.status === "confirmed") && v.visit_date >= today,
  }));

  // Fase Unificar panel del agente (CAMBIO 1): antes acá vivía un resumen
  // condensado de 3 contadores ("Tu mini-CRM") con un link a "ver el
  // mini-CRM completo" en /dashboard/inicio — ahora se muestra DIRECTO el
  // mismo panel de 5 botones de esa pantalla (DomusAgentPanel), así que
  // solo hace falta pedir los 2 contadores de sus badges (ver
  // domus-badge-counts.ts), no los 6 counts de antes.
  const domusBadgeCounts = isDomusAgent
    ? await getDomusAgentBadgeCounts(org.id, isDomusManager ? null : user.id)
    : { consultasNuevoCount: 0, reunionesHoyCount: 0, ofertasReservasCount: 0 };

  // Rediseño del panel de Kapusta (handoff/KAPUSTA_PANEL_SPEC.md) — solo
  // esta org, solo para staff. El resto de las inmobiliarias sigue con el
  // panel de 5 botones (domusBadgeCounts de arriba).
  const kapustaPanelData =
    isKapusta && isDomusAgent
      ? await getKapustaPanelData(org.id, isDomusManager ? null : user.id)
      : undefined;

  const INQUIRY_STATUS_LABEL: Record<string, string> = {
    nuevo: "Enviada",
    contactado: "Te contactamos",
    cerrado: "Resuelta",
  };
  const OFFER_STATUS_LABEL: Record<string, string> = {
    nuevo: "En revisión",
    sumado_al_stock: "¡Publicada!",
    reunion_agendada: "Reunión agendada",
    seguimiento: "En seguimiento",
  };

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

      {/* Casillero "¿Qué estás buscando?" — mismo GeneralInquiryForm de la
          Fase 2b (mismo backend domus_general_inquiries, misma
          confirmación "¡Consulta enviada!"), acá arrancando expandido y
          arriba de todo para que sea el bloque más visible del perfil
          del cliente, no escondido detrás de un botón "Consultas" como
          en la home pública. Solo cliente — un agente no le manda una
          consulta a sí mismo, ve el resumen de abajo en su lugar. */}
      {isDomusCustomer && (
        <GeneralInquiryForm slug={params.slug} orgId={org.id} primaryColor={primary} startOpen />
      )}

      {/* Panel del equipo (CAMBIO 1) — reemplaza las secciones de cliente
          de acá abajo. Mismo componente que /dashboard/inicio. Para
          Kapusta es el panel rediseñado (con su propio header, sin el
          título "Panel del agente" — ver KAPUSTA_PANEL_SPEC §3.1 y el
          glosario); el resto sigue con el de 5 botones y su encabezado. */}
      {isDomusAgent && kapustaPanelData ? (
        <div className="-mx-4">
          <DomusAgentPanel
            orgId={org.id}
            consultasNuevoCount={domusBadgeCounts.consultasNuevoCount}
            reunionesHoyCount={domusBadgeCounts.reunionesHoyCount}
            ofertasReservasCount={domusBadgeCounts.ofertasReservasCount}
            slug={params.slug}
            userName={profile?.full_name ?? user.email?.split("@")[0] ?? null}
            kapustaData={kapustaPanelData}
            primaryColor={org.primary_color ?? "#005F77"}
            secondaryColor={org.secondary_color ?? "#0180AB"}
            backgroundColor={org.background_color ?? "#69BDE1"}
          />
        </div>
      ) : isDomusAgent ? (
        <div className="space-y-2 -mx-4">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-4">
            Panel del agente
          </h2>
          <DomusAgentPanel
            orgId={org.id}
            consultasNuevoCount={domusBadgeCounts.consultasNuevoCount}
            reunionesHoyCount={domusBadgeCounts.reunionesHoyCount}
            ofertasReservasCount={domusBadgeCounts.ofertasReservasCount}
          />
        </div>
      ) : null}

      {/* Ofrecer mi propiedad (Fase 3 Domus) — bloque propio, mismo
          criterio de "un bloque más" que Mis Mascotas/Comentarios arriba. */}
      {isDomusCustomer && (
        <PropertyOfferForm slug={params.slug} orgId={org.id} userId={user.id} primaryColor={primary} />
      )}

      {/* Fase 5 Domus: historial del cliente — tres secciones separadas,
          cada una con su propio título (pedido explícito: no mezclar en
          una sola lista), mismo estilo de card blanca con borde que
          "Historial de consumo" más abajo. */}
      {isDomusCustomer && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Mis consultas
          </h2>
          {myInquiries.length > 0 ? (
            <div className="bg-white divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
              {myInquiries.map((i) => (
                <div key={i.id} className="px-4 py-3 text-sm space-y-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-stone-400">
                      {new Date(i.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-xs font-medium text-stone-500">
                      {INQUIRY_STATUS_LABEL[i.status] ?? i.status}
                    </span>
                  </div>
                  <p className="text-stone-700">{i.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">Todavía no hiciste ninguna consulta.</p>
          )}
        </div>
      )}

      {isDomusCustomer && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Mis visitas
          </h2>
          <MyVisitsList slug={params.slug} visits={myVisits} primaryColor={primary} />
        </div>
      )}

      {isDomusCustomer && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Mis propiedades ofrecidas
          </h2>
          {myOffers.length > 0 ? (
            <div className="bg-white divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
              {myOffers.map((o) => (
                <div key={o.id} className="px-4 py-3 text-sm space-y-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-stone-900">
                      {o.property_type} en {o.operation_type} — {o.address}
                    </p>
                    <span className="text-xs font-medium text-stone-500 shrink-0">
                      {OFFER_STATUS_LABEL[o.status] ?? o.status}
                      {o.status === "reunion_agendada" && o.scheduled_at && (
                        <>
                          {" "}
                          ·{" "}
                          {new Date(o.scheduled_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-stone-500">{formatPrice(o.requested_price, o.currency)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">Todavía no ofreciste ninguna propiedad.</p>
          )}
        </div>
      )}

      {/* Fase T2 Bike: acceso a Taller del lado CLIENTE — mismo lenguaje
          visual que las cards de admin (Bicis/Clientes, Fase P5) de acá
          abajo, pero es un bloque ADICIONAL (el cliente sigue viendo su
          PointsPanel normal después, a diferencia del admin que lo
          reemplaza por completo). */}
      {isBike && !isBikeAdmin && (
        <Link
          href={`/${params.slug}/taller`}
          className="flex items-center gap-4 rounded-2xl px-5 py-5 bg-[#0a0a0b] border border-[#26262a] active:opacity-90 transition-opacity"
        >
          <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#ff6b00]">
            <Wrench className="w-6 h-6 text-[#0a0a0b]" />
          </span>
          <span className="text-lg font-semibold text-white">Taller</span>
        </Link>
      )}

      {/* Fase P5 Bike: resumen de admin — reemplaza el panel de cliente
          (puntos/historial no aplican a un admin) por dos accesos
          directos, mismo lenguaje visual oscuro+naranja que el resto de
          "bike" en esta página. Consultas/Ventas/Taller quedan afuera a
          propósito (fases aparte, todavía no existen — nada de
          placeholders acá). */}
      {isBikeAdmin && (
        <div className="space-y-3">
          {[
            { href: "/dashboard/catalogo", label: "Bicis", icon: Bike },
            { href: "/dashboard/clientes", label: "Clientes", icon: Users },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-2xl px-5 py-5 bg-[#0a0a0b] border border-[#26262a] active:opacity-90 transition-opacity"
            >
              <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#ff6b00]">
                <Icon className="w-6 h-6 text-[#0a0a0b]" />
              </span>
              <span className="text-lg font-semibold text-white">{label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Fase puntos fuera de Mi Perfil (Domus): ni cliente ni agente ven
          el panel de puntos ni la barra de progreso — Domus no tiene
          mecánica de sellos/puntos real (no hay flujo de "compra"), este
          bloque entero solo tenía sentido genérico heredado. El resto de
          las orgs (SuperElectro, Bike, Gym2, Corner, Huellitas) sigue
          viéndolo exactamente igual, salvo el admin de bike (Fase P5,
          ver bloque de arriba). */}
      {!isDomus && !isBikeAdmin && (
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
      )}

      {/* Historial de consumo — tampoco aplica al admin de bike (Fase P5,
          mismo criterio que el bloque de puntos de arriba) ni al staff de
          Kapusta con el panel rediseñado (KAPUSTA_PANEL_SPEC §1.4: "sin
          bloques vacíos", herencia de SuperElectro que no aplica a
          inmobiliaria). Domus lo sigue mostrando igual que siempre. */}
      {!isBikeAdmin && !(isKapusta && isDomusAgent) && (
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
      )}
    </div>
  );
}
