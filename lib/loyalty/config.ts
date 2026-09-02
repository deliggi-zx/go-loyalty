// Fidelización por puntos — hoy habilitada solo para Kapusta. Mismo patrón
// que VET_ORG_SLUGS / CORNER_ORG_SLUGS en app/(public)/[slug]/data.ts:
// gating por slug, único origen de verdad para el sitio público y el panel.
// Domus (la vertical inmobiliaria de la que Kapusta es clon) NO tiene puntos
// — se agrega acá cualquier org que quiera la mecánica.
const LOYALTY_POINTS_SLUGS = new Set(["kapusta"]);

export function isLoyaltyPointsSlug(slug: string | null | undefined): boolean {
  return !!slug && LOYALTY_POINTS_SLUGS.has(slug);
}

// Tipos de movimiento del ledger (loyalty_transactions.type). Los "manual_*"
// los carga un admin desde la ficha del cliente; "signup_bonus" es
// automático al registrarse. El QR de compra de SuperElectro usa "earn"/
// "claimed" por otro camino (lib/loyalty/transactions.ts), no se toca.
export const LOYALTY_MANUAL_TYPES = [
  "manual_visit",
  "manual_operation",
  "manual_referral",
  "manual_review",
  "manual_adjustment",
] as const;

export type LoyaltyManualType = (typeof LOYALTY_MANUAL_TYPES)[number];

export function isLoyaltyManualType(v: string): v is LoyaltyManualType {
  return (LOYALTY_MANUAL_TYPES as readonly string[]).includes(v);
}

// Label legible por tipo, para el historial (ficha del cliente + perfil).
export const LOYALTY_TYPE_LABELS: Record<string, string> = {
  signup_bonus: "Bonus de bienvenida",
  manual_visit: "Asistió a una visita",
  manual_operation: "Cerró una operación",
  manual_referral: "Refirió a alguien que operó",
  manual_review: "Dejó una reseña",
  manual_adjustment: "Ajuste manual",
  earn: "Compra",
};

export function loyaltyTypeLabel(type: string): string {
  return LOYALTY_TYPE_LABELS[type] ?? "Movimiento";
}
