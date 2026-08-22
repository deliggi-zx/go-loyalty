import { createClient } from "@/lib/supabase/server";

// Fase Reservas (Domus): no hay columna de disponibilidad en `products`
// ni en su `specs` (ver Gate 0) — domus_property_reservations ES la
// fuente de verdad. Genérico por product_id: para cualquier otra org
// esta tabla simplemente nunca tiene filas (solo se inserta desde el
// flujo público de Domus, gateado por slug en el caller), así que estos
// helpers no necesitan re-chequear el slug.
//
// Dos señales DISTINTAS, a propósito (pedido explícito, ver Fase
// Reservas puntos 3 y 4):
//  - el botón "Reservar" desaparece con CUALQUIER reserva activa
//    (pendiente_confirmacion o confirmada) — nadie más puede pedir la
//    misma propiedad mientras se resuelve.
//  - el badge público "Reservada" (card/ficha) recién aparece cuando el
//    agente la CONFIRMA — una reserva todavía pendiente podría
//    rechazarse, no tiene sentido anunciarla como reservada de antemano.
export const RESERVATION_ACTIVE_STATUSES = ["pendiente_confirmacion", "confirmada"] as const;

export interface ProductReservationState {
  // Oculta "Reservar" en la ficha.
  hasActiveReservation: boolean;
  // Muestra el badge público "Reservada".
  isConfirmed: boolean;
}

export async function getProductReservationState(productId: string): Promise<ProductReservationState> {
  const supabase = createClient();
  const { data } = await supabase
    .from("domus_property_reservations")
    .select("status")
    .eq("product_id", productId)
    .in("status", RESERVATION_ACTIVE_STATUSES)
    .maybeSingle();

  return {
    hasActiveReservation: !!data,
    isConfirmed: data?.status === "confirmada",
  };
}

// Usado por getProductCatalog (data.ts) para marcar el badge "Reservada"
// en toda la grilla sin una consulta por producto — mismo criterio que
// ProductReservationState.isConfirmed de arriba (solo confirmadas).
export async function getConfirmedReservedProductIds(productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from("domus_property_reservations")
    .select("product_id")
    .in("product_id", productIds)
    .eq("status", "confirmada");
  return new Set((data ?? []).map((r) => r.product_id));
}
