// Fase 3 Huellitas: configuración de turnos, hardcodeada por ahora (pedido
// explícito — no editable desde admin todavía). TODO junto acá para que
// ajustarla después sea trivial: un solo lugar, sin constantes repetidas
// en otros archivos.
//
// Grilla: lunes a sábado, 9:00 a 18:00, turnos de 30 minutos. El último
// turno arranca a las 17:30 (termina justo a las 18:00) — no se ofrece un
// turno que arranque a la hora de cierre.
export const VET_APPOINTMENTS_OPEN_HOUR = 9;
export const VET_APPOINTMENTS_CLOSE_HOUR = 18;
export const VET_APPOINTMENTS_SLOT_MINUTES = 30;

// Date.getDay(): 0 = domingo. Es el único día cerrado (lunes a sábado
// abierto) — si en algún momento se suma otro día cerrado, esto pasa a
// ser un array y isVetAppointmentsClosedDay recorre en vez de comparar.
export const VET_APPOINTMENTS_CLOSED_WEEKDAY = 0;

export function isVetAppointmentsClosedDay(date: Date): boolean {
  return date.getDay() === VET_APPOINTMENTS_CLOSED_WEEKDAY;
}

// Motivo: libre por ahora, sin catálogo cerrado a nivel de base (la
// columna `reason` es texto plano) — esta lista es solo lo que ofrece la
// UI hoy. Ver vet_appointments_config server-side (createAppointment)
// para la validación real contra esta misma lista.
export const VET_APPOINTMENTS_REASONS = [
  { value: "consulta", label: "Consulta" },
  { value: "vacunacion", label: "Vacunación" },
  { value: "peluqueria", label: "Peluquería" },
  { value: "bano", label: "Baño" },
] as const;

export type VetAppointmentReason = (typeof VET_APPOINTMENTS_REASONS)[number]["value"];

export function isValidAppointmentReason(value: string): value is VetAppointmentReason {
  return VET_APPOINTMENTS_REASONS.some((r) => r.value === value);
}

export function appointmentReasonLabel(value: string): string {
  return VET_APPOINTMENTS_REASONS.find((r) => r.value === value)?.label ?? value;
}

// Todos los horarios de arranque posibles en un día hábil, "HH:MM" (24hs)
// — sin filtrar por ya ocupados, eso lo hace getAvailableSlots en
// vet-appointments-data.ts contra lo que ya hay reservado ese día. Mismo
// formato "HH:MM" en toda la app (grilla, payload al server action,
// comparación con lo guardado) para no andar convirtiendo entre formatos
// en cada capa.
export function generateDaySlots(): string[] {
  const slots: string[] = [];
  const totalMinutes = (VET_APPOINTMENTS_CLOSE_HOUR - VET_APPOINTMENTS_OPEN_HOUR) * 60;
  for (let m = 0; m < totalMinutes; m += VET_APPOINTMENTS_SLOT_MINUTES) {
    const hour = VET_APPOINTMENTS_OPEN_HOUR + Math.floor(m / 60);
    const minute = m % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return slots;
}

// "YYYY-MM-DD" de un Date puntual, en hora LOCAL del navegador/servidor,
// no UTC — Date#toISOString() correría el día para cualquiera al oeste
// de UTC después de las 21hs aprox. Factoreado de todayLocalYmd (Fase
// badges Domus) para poder comparar contra "hoy" cualquier fecha que
// llegue como Date (ej. domus_property_offers.scheduled_at), no solo
// "ahora mismo".
export function localYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "YYYY-MM-DD" de hoy, en hora local. Se usa tanto para el `min` del
// input de fecha como para validar server-side que la fecha elegida no
// sea pasada.
export function todayLocalYmd(): string {
  return localYmd(new Date());
}
