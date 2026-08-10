// Acción "Reservar" compartida entre el acceso rápido de la home
// (corner-home.tsx) y el bottom nav (corner-bottom-nav.tsx, tanto el
// ítem "Reservas" como el ícono central) — un único lugar para decidir
// a dónde lleva reservar, así los tres callers no pueden desincronizarse.
// Hoy es un anchor a la card "Tu próxima reserva" de la home (todavía no
// hay modal real). Cuando Fase 4 traiga el modal de verdad, esto pasa a
// abrirlo — con un solo cambio acá alcanza para los tres lugares.
export function getReserveHref(slug: string): string {
  return `/${slug}#reserva`;
}
