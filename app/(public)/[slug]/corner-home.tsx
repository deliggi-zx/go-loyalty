"use client";

import Link from "next/link";
import { Menu, Bell, CalendarClock, Trophy, Dumbbell, Star, ImageOff } from "lucide-react";
import { Carousel } from "./carousel";
import { getReserveHref } from "./corner-actions";
import type { LevelCard, NextReservationCourt } from "./corner-data";

// Foto de cancha nocturna para el hero — Pexels, re-hosteada en el mismo
// bucket/patrón que el resto (loyalty-content/branding/corner/). Es una
// constante fija (siempre presente hoy), pero igual pasa por
// ImagePlaceholder más abajo para quedar consistente con el resto de las
// zonas de imagen si en algún momento pasa a ser configurable.
const HERO_PHOTO_URL =
  "https://inlmzasbkhngqamduugq.supabase.co/storage/v1/object/public/loyalty-content/branding/corner/hero-cancha-nocturna.jpg";

// Fallback prolijo (verde oscuro + ícono) para cualquier zona de imagen
// sin asset todavía — Die va subiendo fotos reales progresivamente (canchas
// en Fase 3, torneos/categorías más adelante) y hasta entonces esto evita
// un <img> roto o un hueco en blanco. NOTA sobre la 2da zona pedida (el
// carrusel de promos): ese usa el componente Carousel compartido con el
// resto de las orgs (Cafetería/Bike/Gym2), sin tocar — y ese componente
// NO tiene este fallback (si image_url es null no renderiza nada, queda
// en blanco). Hoy no es un problema porque los 2 items de Corner siempre
// tienen foto real (ver scripts/seed-corner-images.js), pero si en algún
// momento se caga un item sin foto ahí, se va a ver distinto a las otras
// 4 zonas — no lo tocamos en este ajuste porque es compartido con otras
// orgs, avisar si hace falta resolverlo.
function ImagePlaceholder({
  src,
  alt,
  className,
  fallbackClassName,
}: {
  src: string | null;
  alt: string;
  className: string;
  fallbackClassName?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    );
  }
  return (
    <div
      className={`${className} ${fallbackClassName ?? ""} bg-[#141c17] border border-[#1e8f4e]/20 flex items-center justify-center`}
      aria-label={alt}
    >
      <ImageOff className="w-1/4 h-1/4 text-[#1e8f4e]/40" />
    </div>
  );
}

interface CarouselItem {
  id: string;
  image_url: string | null;
  title: string | null;
}

// Card "Nivel": mismos dos modos reales que devuelve getCornerLevelCard
// (ver corner-data.ts) más un tercero puramente de UI para cuando no hay
// sesión — ver AJUSTE 1.
// - "category": profesor/admin, o cualquier socio ya asignado a una
//   clase real — muestra la categoría de esa clase (default fijo
//   "Formación" si todavía no hay ninguna clase cargada).
// - "ladder": socio (customer) sin clase asignada — alquila cancha, no
//   toma clases. Escalera Amateur/Semi-Pro/Pro/Crack, dato fijo, sin
//   lógica real de qué lo mueve todavía (pedido explícito).
// - "default": sin sesión — cosmético de siempre, Nivel 2 / 60%.
type CornerLevelCard = LevelCard | { mode: "default" };

interface CornerHomeProps {
  slug: string;
  greeting: string;
  userName: string;
  // Real si ya hay fila en loyalty_user_points para este usuario/org (ver
  // page.tsx); null si no hay sesión o todavía no sumó puntos — ahí se
  // usa un dato fijo de demo, mismo criterio "cosmético" que el resto de
  // esta fase.
  pointsBalance: number | null;
  carouselItems: CarouselItem[];
  levelCard: CornerLevelCard;
  // Fase 3: cancha real (nombre/tipo/foto) si ya hay al menos una cargada
  // en gym_courts — null hasta entonces, cae al mock completo de siempre.
  // La fecha/hora de "Tu próxima reserva" sigue siendo mock en los dos
  // casos: la reserva en sí no es real todavía (eso es Fase 4).
  nextReservationCourt: NextReservationCourt | null;
}

// Clases por edades — 4 categorías con color propio (Fase 2, todavía sin
// age_category real en gym_class_schedule, eso es Fase 5). Paleta pedida:
// verde/azul/violeta/naranja, ninguno es el --accent-corner (#1e8f4e) para
// que la card "activa"/de marca no se confunda con una categoría más.
// photoUrl null hoy en las 4 — si Die sube fotos por categoría más
// adelante, ImagePlaceholder ya sabe mostrarlas; hasta entonces el
// círculo de color ES el fallback prolijo (a propósito, no es un bug).
const AGE_CATEGORIES: { label: string; sub: string; color: string; photoUrl: string | null }[] = [
  { label: "Infantiles", sub: "6 a 12 años", color: "#2fb85c", photoUrl: null },
  { label: "Juveniles", sub: "13 a 17 años", color: "#2f8fd1", photoUrl: null },
  { label: "Adultos", sub: "18 a 34 años", color: "#8b5cf6", photoUrl: null },
  { label: "Veteranos +35", sub: "35 años o más", color: "#f5872e", photoUrl: null },
];

const MOCK_POINTS = 850;

export function CornerHome({
  slug,
  greeting,
  userName,
  pointsBalance,
  carouselItems,
  levelCard,
  nextReservationCourt,
}: CornerHomeProps) {
  const points = pointsBalance ?? MOCK_POINTS;
  const reserveHref = getReserveHref(slug);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white pb-24">
      {/* Header propio: ☰ + campanita, sin lógica (Fase 2 es 100%
          cosmético) — no abren SideMenu ni ninguna notificación real
          todavía. Distinto del ClientHeader genérico a propósito: Corner
          no usa el patrón de menú lateral del resto de las orgs (ver
          CornerBottomNav). */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#0a0a0b]/90 backdrop-blur border-b border-[#1c1c1e]">
        <button aria-label="Menú" className="p-2 -ml-2 text-white">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold tracking-wide text-white">Corner</span>
        <button aria-label="Notificaciones" className="p-2 -mr-2 text-white">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Hero: saludo + foto de cancha nocturna (zona de imagen 1/5) */}
        <div className="relative rounded-2xl overflow-hidden h-44">
          <ImagePlaceholder
            src={HERO_PHOTO_URL}
            alt="Cancha de Corner de noche"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-xs text-[#9b9995]">{greeting}</p>
            <p className="text-lg font-semibold text-white">{userName} 👋</p>
          </div>
        </div>

        {/* Nivel + Puntos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#141416] rounded-2xl border border-[#26262a] p-4 space-y-2">
            {levelCard.mode === "category" && (
              <>
                <p className="text-xs text-[#9b9995] uppercase tracking-wide">Categoría</p>
                <p className="text-lg font-bold text-white leading-tight pt-1">{levelCard.label}</p>
              </>
            )}
            {levelCard.mode === "ladder" && (
              <>
                <p className="text-xs text-[#9b9995] uppercase tracking-wide">Nivel</p>
                <p className="text-lg font-bold text-white leading-tight">{levelCard.rung}</p>
                <div className="w-full h-1.5 rounded-full bg-[#26262a] overflow-hidden">
                  <div className="h-full rounded-full bg-[#1e8f4e]" style={{ width: "60%" }} />
                </div>
              </>
            )}
            {levelCard.mode === "default" && (
              <>
                <p className="text-xs text-[#9b9995] uppercase tracking-wide">Nivel</p>
                <p className="text-2xl font-bold text-white">2</p>
                <div className="w-full h-1.5 rounded-full bg-[#26262a] overflow-hidden">
                  <div className="h-full rounded-full bg-[#1e8f4e]" style={{ width: "60%" }} />
                </div>
              </>
            )}
          </div>
          <div id="puntos" className="bg-[#141416] rounded-2xl border border-[#26262a] p-4 space-y-2 scroll-mt-20">
            <p className="text-xs text-[#9b9995] uppercase tracking-wide">Tus puntos</p>
            <p className="text-2xl font-bold text-white">{points.toLocaleString("es-AR")}</p>
            <p className="text-xs text-[#6b6965]">pts acumulados</p>
          </div>
        </div>

        {/* Accesos rápidos: los 3 primeros bajan a su sección en esta
            misma página; "Mis puntos" ya está arriba, así que apunta a la
            card de puntos (id="puntos") en vez de duplicar contenido.
            "Reservar" usa getReserveHref — mismo destino que el ícono
            central del bottom nav, ver corner-actions.ts. */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Reservar", icon: CalendarClock, href: reserveHref },
            { label: "Torneos", icon: Trophy, href: "#torneos" },
            { label: "Clases", icon: Dumbbell, href: "#clases" },
            { label: "Mis puntos", icon: Star, href: "#puntos" },
          ].map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-[#141416] border border-[#26262a] hover:border-[#1e8f4e] transition-colors"
            >
              <Icon className="w-5 h-5 text-[#1e8f4e]" />
              <span className="text-[10px] font-medium text-[#d8d6d2] text-center leading-tight">
                {label}
              </span>
            </a>
          ))}
        </div>

        {/* Carrusel de promos (zona de imagen 2/5) — mismo componente
            Carousel de siempre, sin tocarlo. Contenido real en
            loyalty_content (type='carousel'). Ver nota de fallback en el
            comentario de ImagePlaceholder más arriba. */}
        {carouselItems.length > 0 && <Carousel items={carouselItems} />}

        {/* Tu próxima reserva (zona de imagen 3/5: miniatura de cancha) —
            la fecha/hora sigue siendo mock siempre (la reserva en sí no es
            real todavía, eso es Fase 4), pero desde Fase 3 el nombre/tipo/
            foto de la cancha son reales en cuanto haya al menos una
            cargada (gym_courts, ver getCornerNextReservationCourt) — si
            no, cae al mock completo de antes. */}
        <div id="reserva" className="bg-[#141416] rounded-2xl border border-[#26262a] p-4 space-y-3 scroll-mt-20">
          <p className="text-xs text-[#9b9995] uppercase tracking-wide">Tu próxima reserva</p>
          <div className="flex items-center gap-3">
            <ImagePlaceholder
              src={nextReservationCourt?.photoUrl ?? null}
              alt={nextReservationCourt?.name ?? "Cancha"}
              className="w-14 h-14 rounded-xl shrink-0 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {nextReservationCourt
                  ? `${nextReservationCourt.name} · ${nextReservationCourt.courtTypeLabel}`
                  : "Cancha 3 · Fútbol 5"}
              </p>
              <p className="text-sm text-[#9b9995]">Viernes 14/8 — 21:00 hs</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg border border-[#1e8f4e] text-[#1e8f4e] hover:bg-[#1e8f4e]/10 transition-colors"
            >
              Ver reserva
            </button>
          </div>
        </div>

        {/* Torneos próximos (zona de imagen 4/5: miniatura del torneo) —
            cosmético, contenido propio de Corner, NO conectado a Go
            Fútbol (proyecto aparte). tournamentPhotoUrl null por ahora. */}
        <div id="torneos" className="space-y-3 scroll-mt-20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            Torneos próximos
          </h2>
          <div className="bg-[#141416] rounded-2xl border border-[#26262a] p-4 flex items-center gap-3">
            <ImagePlaceholder
              src={null}
              alt="Copa Apertura"
              className="w-14 h-14 rounded-xl shrink-0 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">Copa Apertura</p>
              <p className="text-sm text-[#9b9995]">Empieza 20/8 · 16 equipos</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-[#1e8f4e] text-white hover:bg-[#1e8f4e]/90 transition-colors"
            >
              Inscribirme
            </button>
          </div>
        </div>

        {/* Clases por edades (zona de imagen 5/5: ícono/foto por
            categoría) — scroll horizontal, 4 categorías con color propio
            (age_category real recién en Fase 5). "Ver todas" sin destino
            real todavía. */}
        <div id="clases" className="space-y-3 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
              Clases por edades
            </h2>
            <span className="text-xs text-[#6b6965]">Ver todas</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
            {AGE_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="shrink-0 w-36 rounded-2xl p-4 snap-start"
                style={{
                  backgroundColor: `color-mix(in srgb, ${cat.color} 18%, #141416)`,
                  border: `1px solid color-mix(in srgb, ${cat.color} 45%, transparent)`,
                }}
              >
                {cat.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.photoUrl}
                    alt={cat.label}
                    className="w-8 h-8 rounded-full mb-3 object-cover"
                  />
                ) : (
                  <span
                    className="inline-block w-8 h-8 rounded-full mb-3"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  />
                )}
                <p className="font-semibold text-white text-sm">{cat.label}</p>
                <p className="text-xs text-[#9b9995]">{cat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Volver al perfil real (puntos + historial) — mismo criterio
            que el resto de las orgs, ya funcional. */}
        <Link
          href={`/${slug}/perfil`}
          className="block text-center text-xs text-[#6b6965] hover:text-white transition-colors pt-2"
        >
          Ver historial completo
        </Link>
      </div>
    </div>
  );
}
