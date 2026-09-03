// Cartera de clientes — helpers compartidos entre el server component
// (page.tsx), las server actions (actions.ts) y los componentes cliente
// del alta manual / importación. Ver migración
// create_domus_portfolio_clients: la tabla domus_portfolio_clients guarda
// clientes que NO tienen cuenta en el sitio (cargados a mano o importados
// desde planilla), con sus datos de contacto en la propia fila.

// Solo estos dos slugs comparten la vertical inmobiliaria (Domus original
// + Kapusta, su clon). Mismo guard que ya usan page.tsx y seguimiento.
export const PORTFOLIO_SLUGS = ["domus", "kapusta"] as const;
export const PORTFOLIO_ROLES = ["admin", "agente"] as const;

export interface PortfolioClientInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profession: string;
  budgetRange: string;
  interestZone: string;
  consintioComunicaciones: boolean;
}

// Clave de deduplicación: teléfono normalizado a sus últimos 8 dígitos
// (alcanza para no depender de que todos hayan cargado prefijo de país /
// característica de la misma forma) o mail en minúscula sin espacios.
export function normalizePhoneKey(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length > 8 ? digits.slice(-8) : digits;
}

export function normalizeEmailKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

// ¿La fila entrante choca contra algún contacto que ya existe? Compara por
// mail O por teléfono. `existingPhones` / `existingEmails` son sets de
// claves ya normalizadas.
export function isDuplicate(
  row: { phone?: string | null; email?: string | null },
  existingPhones: Set<string>,
  existingEmails: Set<string>
): boolean {
  const pk = normalizePhoneKey(row.phone);
  const ek = normalizeEmailKey(row.email);
  return (!!pk && existingPhones.has(pk)) || (!!ek && existingEmails.has(ek));
}

// tel: — los clientes de teléfono son tolerantes, se pasa casi crudo
// (dejando un eventual "+" inicial).
export function telHref(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

// https://wa.me/<número internacional sin +>. Si el número viene sin
// prefijo de país (10–11 dígitos, típico de un celular argentino cargado
// como "11 2345-6789" o "011..."), se le antepone 54. Si ya trae país
// (más largo, o arranca en 54) se respeta tal cual.
export function whatsappHref(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.length <= 11 && !digits.startsWith("54")) {
    digits = `54${digits}`;
  }
  return `https://wa.me/${digits}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

// wa.me con el mensaje precargado en el parámetro ?text=. Se usa para el
// envío guiado a varios clientes: no manda nada solo, abre la conversación
// de WhatsApp con el texto ya escrito para que la persona solo apriete
// enviar. `text` vacío devuelve el link pelado.
export function whatsappTextHref(rawPhone: string, text: string): string {
  const base = whatsappHref(rawPhone);
  return text.trim() ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Reemplaza las variables simples del mensaje ({nombre}) por los datos del
// cliente. Hoy solo {nombre} → primer token del nombre completo (más
// natural en un saludo de WhatsApp que el nombre y apellido enteros).
export function fillMessageVars(message: string, fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName.trim();
  return message.replace(/\{nombre\}/gi, firstName);
}

// --- CSV (export + plantilla + parseo de importación) ---

export function csvCell(value: string | null | undefined): string {
  const v = value ?? "";
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: (string | null | undefined)[][]): string {
  // BOM para que Excel abra los acentos bien.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// Parser CSV mínimo pero correcto con comillas y saltos de línea dentro de
// celda. Devuelve matriz de strings.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Encabezados esperados de la plantilla, y sus alias tolerados. Se
// normaliza cada header (minúscula, sin acentos, sin espacios) antes de
// buscar acá.
const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  nombre: "firstName",
  nombres: "firstName",
  apellido: "lastName",
  apellidos: "lastName",
  telefono: "phone",
  tel: "phone",
  celular: "phone",
  cel: "phone",
  whatsapp: "phone",
  mail: "email",
  email: "email",
  correo: "email",
  zona: "interestZone",
  zonadeinteres: "interestZone",
  barrio: "interestZone",
  presupuesto: "budgetRange",
  profesion: "profession",
};

export interface ImportRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  interestZone: string;
  budgetRange: string;
  profession: string;
}

export const TEMPLATE_HEADERS = [
  "nombre",
  "apellido",
  "telefono",
  "mail",
  "zona",
  "presupuesto",
] as const;

function normHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// De una matriz cruda (primera fila = encabezados) a filas tipadas.
// Ignora columnas que no reconoce.
export function rowsFromMatrix(matrix: string[][]): ImportRow[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((h) => HEADER_ALIASES[normHeader(h)] ?? null);
  return matrix.slice(1).map((cols) => {
    const r: ImportRow = {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      interestZone: "",
      budgetRange: "",
      profession: "",
    };
    headers.forEach((key, idx) => {
      if (key) r[key] = (cols[idx] ?? "").trim();
    });
    return r;
  });
}
