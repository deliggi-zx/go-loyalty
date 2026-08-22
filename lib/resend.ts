import { Resend } from "resend";

// Fase Reservas (Domus): cliente Resend + límite conocido de la cuenta
// SIN dominio propio verificado (Gate 0, confirmado con un mail de
// prueba real) — en ese estado, Resend solo permite:
//   - mandar como remitente el sandbox "onboarding@resend.dev" (no un
//     mail del dominio propio, todavía no existe)
//   - mandar A la casilla del dueño de la cuenta (RESERVATION_NOTIFY_
//     EMAIL más abajo), a NINGÚN otro destinatario
// Por eso el mail de cada reserva se manda siempre a esa casilla fija,
// sin importar qué cliente reservó — el día que se verifique un
// dominio propio en Resend, hay que cambiar:
//   1. RESEND_SANDBOX_FROM acá abajo por una casilla del dominio propio
//   2. el `to` de sendReservationRequestEmail, de RESERVATION_NOTIFY_
//      EMAIL al mail real del cliente que reservó (hoy no se guarda en
//      ningún lado — profiles no tiene columna email, habría que leerlo
//      de auth.users o pedirlo en el form de reserva)
const RESEND_SANDBOX_FROM = "onboarding@resend.dev";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export interface ReservationRequestEmailInput {
  propertyName: string;
  clientName: string;
  clientPhone: string;
}

// Mail real al agente (mail fijo, ver comentario arriba) avisando que
// alguien reservó una propiedad, con los datos para que se contacte
// directo por teléfono — no bloquea la reserva si falla: el caller
// (createPropertyReservation) ya guardó la fila antes de llamar acá, el
// agente igual la va a ver en /dashboard/reservas aunque el mail no
// salga.
export async function sendReservationRequestEmail(
  input: ReservationRequestEmailInput
): Promise<{ ok: boolean }> {
  const resend = getResendClient();
  const notifyEmail = process.env.RESERVATION_NOTIFY_EMAIL;
  if (!resend || !notifyEmail) return { ok: false };

  const { error } = await resend.emails.send({
    from: RESEND_SANDBOX_FROM,
    to: notifyEmail,
    subject: `Nueva reserva: ${input.propertyName}`,
    text:
      `Se registró una nueva reserva en Domus.\n\n` +
      `Propiedad: ${input.propertyName}\n` +
      `Cliente: ${input.clientName}\n` +
      `Teléfono: ${input.clientPhone}\n\n` +
      `Instrucciones: contactá al cliente para coordinar la seña y la ` +
      `documentación necesaria, y confirmá o rechazá la reserva desde ` +
      `/dashboard/reservas.`,
  });

  return { ok: !error };
}
