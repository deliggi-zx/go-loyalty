// ─────────────────────────────────────────────────────────────────────────
// Sistema de niveles de la vertical inmobiliaria (Inmo Básica / Pro / 360)
// ─────────────────────────────────────────────────────────────────────────
//
// Reemplaza los chequeos hardcodeados `slug === "domus" || slug === "kapusta"`
// (y `isLoyaltyPointsSlug`, `PORTFOLIO_SLUGS`, etc.) por una pregunta única:
// "¿esta organización tiene acceso a la función X?".
//
// El nivel vive en `loyalty_organizations.feature_tier` (text, nullable):
//   - null        → la org NO pertenece a la vertical inmobiliaria (cafetería,
//                   gym, bike, corner, huellitas, superelectro…). hasFeature
//                   devuelve false para toda feature de la vertical.
//   - 'basica'    → Inmo Básica
//   - 'pro'       → Inmo Pro   (incluye todo lo de Básica)
//   - '360'       → Inmo 360   (incluye todo lo de Pro)
//
// Overrides puntuales en `loyalty_organizations.feature_overrides` (jsonb,
// mapa { "<feature>": true | false }): prenden/apagan una feature por encima
// del tier. Se usa para casos particulares — hoy sólo Kapusta, una versión
// promocional sin costo que tiene chatbot IA y fidelización con QR (features
// de 360) aunque su tier es 'pro'.
//
// El reparto de qué función va en qué nivel lo confirmó el product owner
// (Diego). Ver la auditoría del 07/09 y las 10 definiciones que la cerraron.

export type FeatureTier = "basica" | "pro" | "360";

export type Feature =
  // ── BÁSICA ──────────────────────────────────────────────────────────────
  // Catálogo inmobiliario, tanto público como en el panel: buscador con
  // filtros combinables (operación / tipo / zona — DomusPropertyFilters),
  // ficha de propiedad con galería y contacto, card que linkea a la ficha
  // (no al modal de e-commerce), form de specs orientado al rubro
  // (PropertySpecsForm), inferencia de moneda por categoría raíz, campos de
  // e-commerce ocultos (precio tachado, cuotas, badge de envío), bloque de
  // video en la galería, títulos "Catálogo de propiedades" / "Agregar
  // propiedad", CategoryManager colapsable.
  | "catalogo_propiedades"
  // Requisitos de venta / alquiler: RequirementsForm en Configuración +
  // panel "Requisitos" en la ficha pública.
  | "requisitos_operacion"
  // Las 4 calculadoras (crédito hipotecario, calculadora tradicional,
  // tasación por m², ajuste de alquiler ICL/IPC): página /<slug>/calculadoras,
  // link en el drawer, tarjeta en el home, server actions. El dock flotante
  // arrastrable NO entra acá (es diseño, sólo se monta si hay chatbot_ia —
  // ver definición 6).
  | "calculadoras"
  // ── PRO (incluye todo Básica) ───────────────────────────────────────────
  // Agenda de visitas online: /dashboard/visitas (disponibilidad + agenda),
  // "Solicitar visita" en la ficha pública, "Mis visitas" en el perfil del
  // cliente.
  | "agenda_visitas"
  // Reservas de propiedad: botón "Reservar" en la ficha, badge "Reservada"
  // en el catálogo, panel /dashboard/reservas. Va con la agenda (def. 3).
  | "reservas_propiedad"
  // CRM básico de consultas y leads: /dashboard/inicio/* (Consultas,
  // Ofertas/Reservas, Seguimiento, Reuniones), /dashboard/{consultas,ofertas},
  // GeneralInquiryForm / PropertyOfferForm en el sitio público, "Mis
  // consultas" / "Mis propiedades ofrecidas" en el perfil, panel del agente,
  // ítems del sidebar (Inicio/Consultas/Ofertas), íconos de staff que
  // dependen del rol.
  | "crm_leads"
  // Registro extendido del cliente: apellido obligatorio + teléfono /
  // profesión / presupuesto / zona de interés → domus_client_profile_details.
  // Alimenta el CRM y la cartera, por eso es Pro y no Básica (def. 2).
  | "registro_extendido"
  // Cartera de clientes ampliada: /dashboard/inicio/contactos, alta manual,
  // importar desde planilla, accesos rápidos de contacto, exportar CSV,
  // WhatsApp a varios.
  | "cartera_clientes"
  // Integración con Google Calendar (OAuth): conectar/desconectar en
  // Configuración, espejo de las reuniones cargadas a mano. Requiere además
  // que el entorno tenga configuradas las credenciales de Google
  // (isCalendarConfigured() en lib/google-calendar-oauth.ts) — eso es un
  // prerequisito global, no parte del nivel.
  | "google_calendar"
  // Resumen matutino con IA (Gemini) en el panel del agente. Se queda en
  // Pro, no sube a 360 con el chatbot (def. 5).
  | "resumen_matutino"
  // Favoritos: el carrito genérico pasa a "Favoritos" (ícono estrella,
  // "Enviar consulta" en vez de "Finalizar compra", sin total). Una org
  // inmobiliaria de nivel Básica NO muestra ni carrito ni favoritos (def. 1).
  | "favoritos"
  // ── 360 (incluye todo Pro) ──────────────────────────────────────────────
  // Chatbot con IA 24/7: DomusChatWidget (launcher fijo en la home y la
  // ficha) / DomusChatPanel (en el dock flotante arrastrable).
  | "chatbot_ia"
  // Sistema de fidelización con QR: bono de bienvenida, sumar puntos a mano,
  // registro de frecuencia de visitas (VisitTracker), PointsBadge site-wide,
  // historial de puntos en el perfil, QR imprimible en Configuración,
  // página /<slug>/bienvenida.
  | "fidelizacion_qr";

const TIER_RANK: Record<FeatureTier, number> = {
  basica: 0,
  pro: 1,
  "360": 2,
};

// Nivel mínimo que habilita cada feature. Un tier habilita una feature si su
// rango es >= al del nivel mínimo (pro incluye Básica, 360 incluye Pro).
const FEATURE_MIN_TIER: Record<Feature, FeatureTier> = {
  catalogo_propiedades: "basica",
  requisitos_operacion: "basica",
  calculadoras: "basica",
  agenda_visitas: "pro",
  reservas_propiedad: "pro",
  crm_leads: "pro",
  registro_extendido: "pro",
  cartera_clientes: "pro",
  google_calendar: "pro",
  resumen_matutino: "pro",
  favoritos: "pro",
  chatbot_ia: "360",
  fidelizacion_qr: "360",
};

export function isFeatureTier(value: unknown): value is FeatureTier {
  return value === "basica" || value === "pro" || value === "360";
}

// Forma mínima que necesitan hasFeature / isRealEstateOrg. Cualquier fila de
// loyalty_organizations que traiga estas dos columnas sirve; el resto de las
// columnas no importan.
export interface OrgFeatureInfo {
  feature_tier?: string | null;
  feature_overrides?: Record<string, unknown> | null;
}

// ¿La organización pertenece a la vertical inmobiliaria? true para cualquier
// tier (basica/pro/360). Se usa para lo que es DISEÑO y no nivel: íconos de
// staff en el header público, Configuración reordenada (QR arriba, ocultar
// Lista de precios / Carrusel / Colores / Banner, "Promos" → "Flyers"),
// estilo vidrio + FABs. Aplica igual en los 3 niveles.
export function isRealEstateOrg(org: OrgFeatureInfo | null | undefined): boolean {
  return isFeatureTier(org?.feature_tier);
}

// ¿Esta organización tiene acceso a la feature indicada?
//   1. Si feature_overrides trae la key con un booleano, gana ese valor.
//   2. Si no, se compara el tier de la org contra el nivel mínimo de la feature.
//   3. Una org sin tier (feature_tier null / inválido) no tiene ninguna feature.
export function hasFeature(
  org: OrgFeatureInfo | null | undefined,
  feature: Feature
): boolean {
  const override = org?.feature_overrides?.[feature];
  if (typeof override === "boolean") return override;

  const tier = org?.feature_tier;
  if (!isFeatureTier(tier)) return false;

  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

// Todas las features que un tier habilita por defecto (sin contar overrides).
// Para los chequeos de verificación de punta a punta (paso 6): comparar lo
// que cada slug tiene prendido contra lo que su nivel debería habilitar.
export function featuresForTier(tier: FeatureTier): Feature[] {
  return (Object.keys(FEATURE_MIN_TIER) as Feature[]).filter(
    (f) => TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[f]]
  );
}
