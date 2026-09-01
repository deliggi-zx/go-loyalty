import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";

// Integración real con Google Calendar vía OAuth2 — un único calendario
// compartido por org (hoy solo Kapusta). Ver lib/google-calendar.ts para
// el camino viejo (link "Agregar a Google Calendar", sin sync), que sigue
// existiendo para visitas/ofertas.
//
// Setup que hace Die (una vez): proyecto en Google Cloud, habilitar
// Calendar API, pantalla de consentimiento OAuth con scope
// calendar.events, credenciales de "app web", y estas variables de
// entorno:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI   (.../api/google-calendar/callback)
//   GOOGLE_CALENDAR_ID          (id del calendario dedicado, o "primary")
//   CALENDAR_TOKEN_SECRET       (cadena aleatoria — cifra el refresh token)

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];
const AR_TZ = "America/Argentina/Buenos_Aires";

export function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI &&
      process.env.CALENDAR_TOKEN_SECRET
  );
}

function requireConfig() {
  if (!isCalendarConfigured()) {
    throw new Error("Google Calendar no está configurado (faltan variables de entorno)");
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    tokenSecret: process.env.CALENDAR_TOKEN_SECRET!,
  };
}

// ── Cifrado del refresh token (AES-256-GCM) ──────────────────────────────

function keyFromSecret(secret: string): Buffer {
  // Deriva 32 bytes del secreto sea cual sea su formato/largo.
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const { tokenSecret } = requireConfig();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(tokenSecret), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptToken(payload: string): string {
  const { tokenSecret } = requireConfig();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("refresh token cifrado inválido");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyFromSecret(tokenSecret),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ── Flujo OAuth ─────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = requireConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // fuerza a Google a devolver siempre un refresh_token
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope: string;
}

function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function exchangeCodeForTokens(code: string): Promise<{
  refreshToken: string;
  email: string | null;
}> {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google token exchange falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.refresh_token) {
    throw new Error(
      "Google no devolvió refresh_token. Revocá el acceso de la app en la cuenta de Google y volvé a conectar."
    );
  }
  return { refreshToken: data.refresh_token, email: emailFromIdToken(data.id_token) };
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = requireConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google refresh falló: ${res.status} ${await res.text()}`);
  }
  return ((await res.json()) as TokenResponse).access_token;
}

// ── Persistencia de la conexión ─────────────────────────────────────────

export interface CalendarConnectionInfo {
  connectedEmail: string | null;
  connectedAt: string;
}

export async function getConnectionInfo(orgId: string): Promise<CalendarConnectionInfo | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("google_calendar_connection")
    .select("connected_email, connected_at")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return null;
  return { connectedEmail: data.connected_email, connectedAt: data.connected_at };
}

export async function saveConnection(
  orgId: string,
  refreshToken: string,
  email: string | null,
  connectedBy: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("google_calendar_connection").upsert(
    {
      org_id: orgId,
      refresh_token_encrypted: encryptToken(refreshToken),
      connected_email: email,
      connected_by: connectedBy,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );
  if (error) throw new Error(error.message);
}

export async function disconnect(orgId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("google_calendar_connection").delete().eq("org_id", orgId);
}

async function getRefreshToken(orgId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("google_calendar_connection")
    .select("refresh_token_encrypted")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data?.refresh_token_encrypted) return null;
  return decryptToken(data.refresh_token_encrypted);
}

// ── Crear evento ────────────────────────────────────────────────────────

export interface CalendarEventInput {
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
}

// Devuelve el id del evento creado, o null si no hay conexión / no está
// configurado / Google falló. NUNCA lanza: el caller guarda igual en la
// base (el calendario es un espejo, no la fuente de verdad).
export async function tryCreateCalendarEvent(
  orgId: string,
  input: CalendarEventInput
): Promise<string | null> {
  try {
    if (!isCalendarConfigured()) return null;
    const refreshToken = await getRefreshToken(orgId);
    if (!refreshToken) return null;

    const accessToken = await getAccessToken(refreshToken);
    const { calendarId } = requireConfig();

    const startLocal = `${input.date}T${input.time}:00`;
    const [h, m] = input.time.split(":").map(Number);
    const endMinutes = h * 60 + m + (input.durationMinutes ?? 60);
    const endLocal = `${input.date}T${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(
      endMinutes % 60
    ).padStart(2, "0")}:00`;

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          summary: input.title,
          description: input.description || undefined,
          location: input.location || undefined,
          start: { dateTime: startLocal, timeZone: AR_TZ },
          end: { dateTime: endLocal, timeZone: AR_TZ },
        }),
      }
    );
    if (!res.ok) {
      console.error("Google Calendar create event falló:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error("tryCreateCalendarEvent:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function tryDeleteCalendarEvent(orgId: string, eventId: string): Promise<void> {
  try {
    if (!isCalendarConfigured()) return;
    const refreshToken = await getRefreshToken(orgId);
    if (!refreshToken) return;
    const accessToken = await getAccessToken(refreshToken);
    const { calendarId } = requireConfig();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
  } catch (err) {
    console.error("tryDeleteCalendarEvent:", err instanceof Error ? err.message : err);
  }
}
