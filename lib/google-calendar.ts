// Fase 6 Domus: link "Agregar a Google Calendar" — camino simple (pedido
// explícito, ver documento de visión), sin OAuth ni integración real: es
// una URL que abre Google Calendar con el evento precargado, el agente lo
// confirma y lo guarda del lado de Google a mano. Sin sincronización en
// ningún sentido — si el agente cancela la visita acá, el evento ya
// guardado en Google no se entera. Genérico en la implementación (nada de
// Domus hardcodeado), aunque hoy solo lo usa /dashboard/inicio/reuniones.

export interface GoogleCalendarEventInput {
  title: string;
  start: Date;
  // 1 hora fija si no hay hora de fin real (pedido explícito) — ninguna
  // de las dos fuentes (domus_property_offers.scheduled_at,
  // domus_property_visits.visit_time) guarda una duración.
  durationMinutes?: number;
  details?: string;
  location?: string;
}

// "YYYYMMDDTHHmmssZ" — formato que espera el parámetro `dates` de Google
// Calendar (sin guiones/dos puntos/milisegundos). Date#toISOString() ya
// da la hora en UTC sin importar en qué timezone se haya construido el
// Date original, así que esto funciona igual para un scheduled_at con
// offset real (offers) que para un Date armado a mano en hora local
// (visits, ver reuniones/page.tsx) — en ambos casos el objeto Date ya es
// un instante absoluto.
function toGoogleCalendarDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildGoogleCalendarUrl({
  title,
  start,
  durationMinutes = 60,
  details,
  location,
}: GoogleCalendarEventInput): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
