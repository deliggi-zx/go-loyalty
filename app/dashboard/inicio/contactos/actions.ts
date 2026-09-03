"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  PORTFOLIO_ROLES,
  PORTFOLIO_SLUGS,
  isDuplicate,
  normalizeEmailKey,
  normalizePhoneKey,
  type ImportRow,
  type PortfolioClientInput,
} from "./portfolio";

type Guard =
  | { ok: true; orgId: string; userId: string }
  | { ok: false; error: "unauthorized" };

// Mismo criterio que page.tsx: usuario logueado, miembro admin/agente de
// una org de la vertical inmobiliaria (domus | kapusta).
async function guard(): Promise<Guard> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role, org_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership || !(PORTFOLIO_ROLES as readonly string[]).includes(membership.role)) {
    return { ok: false, error: "unauthorized" };
  }

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (!org || !(PORTFOLIO_SLUGS as readonly string[]).includes(org.slug)) {
    return { ok: false, error: "unauthorized" };
  }

  return { ok: true, orgId: membership.org_id, userId: user.id };
}

// Junta las claves (teléfono normalizado / mail en minúscula) de TODO lo
// que ya cuenta como contacto de la org: la cartera manual +
// consultas/ofertas/visitas de clientes con cuenta. Se usa para no
// duplicar al importar / al cargar a mano.
async function existingContactKeys(orgId: string): Promise<{
  phones: Set<string>;
  emails: Set<string>;
}> {
  const supabase = createClient();
  const [{ data: portfolio }, { data: inquiries }, { data: offers }, { data: visits }, { data: details }] =
    await Promise.all([
      supabase.from("domus_portfolio_clients").select("phone, email").eq("org_id", orgId),
      supabase.from("domus_general_inquiries").select("phone").eq("org_id", orgId),
      supabase.from("domus_property_offers").select("phone").eq("org_id", orgId),
      supabase.from("domus_property_visits").select("phone").eq("org_id", orgId),
      supabase.from("domus_client_profile_details").select("phone").eq("org_id", orgId),
    ]);

  const phones = new Set<string>();
  const emails = new Set<string>();
  for (const r of portfolio ?? []) {
    const pk = normalizePhoneKey(r.phone);
    if (pk) phones.add(pk);
    const ek = normalizeEmailKey(r.email);
    if (ek) emails.add(ek);
  }
  for (const list of [inquiries, offers, visits, details]) {
    for (const r of list ?? []) {
      const pk = normalizePhoneKey((r as { phone: string | null }).phone);
      if (pk) phones.add(pk);
    }
  }
  return { phones, emails };
}

export type AddClientResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "invalid" | "duplicate" };

// Alta manual desde el botón "Agregar cliente".
export async function addPortfolioClient(input: PortfolioClientInput): Promise<AddClientResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, error: "unauthorized" };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  if (!firstName) return { ok: false, error: "invalid" };
  if (!phone && !email) return { ok: false, error: "invalid" };

  const { phones, emails } = await existingContactKeys(g.orgId);
  if (isDuplicate({ phone, email }, phones, emails)) {
    return { ok: false, error: "duplicate" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("domus_portfolio_clients").insert({
    org_id: g.orgId,
    created_by: g.userId,
    source: "manual",
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
    email: email || null,
    profession: input.profession.trim() || null,
    budget_range: input.budgetRange.trim() || null,
    interest_zone: input.interestZone.trim() || null,
    consintio_comunicaciones: input.consintioComunicaciones,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/inicio/contactos");
  revalidatePath("/dashboard/inicio");
  return { ok: true };
}

export type ImportResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: "unauthorized" | "empty" };

// Importación desde planilla. `rows` ya viene limpio y de-duplicado en el
// cliente (previsualización), pero acá se vuelve a chequear contra la base
// por si algo cambió entre la carga y la confirmación, y se insertan solo
// las filas realmente nuevas.
export async function importPortfolioClients(rows: ImportRow[]): Promise<ImportResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, error: "unauthorized" };
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "empty" };

  const { phones, emails } = await existingContactKeys(g.orgId);

  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const toInsert: ImportRow[] = [];
  for (const row of rows) {
    const firstName = (row.firstName ?? "").trim();
    const phone = (row.phone ?? "").trim();
    const email = (row.email ?? "").trim();
    if (!firstName || (!phone && !email)) continue;
    if (isDuplicate({ phone, email }, phones, emails)) continue;
    if (isDuplicate({ phone, email }, seenPhones, seenEmails)) continue;
    const pk = normalizePhoneKey(phone);
    const ek = normalizeEmailKey(email);
    if (pk) seenPhones.add(pk);
    if (ek) seenEmails.add(ek);
    toInsert.push({ ...row, firstName, phone, email });
  }

  const skipped = rows.length - toInsert.length;
  if (toInsert.length === 0) {
    return { ok: true, inserted: 0, skipped };
  }

  const supabase = createClient();
  const { error } = await supabase.from("domus_portfolio_clients").insert(
    toInsert.map((row) => ({
      org_id: g.orgId,
      created_by: g.userId,
      source: "import",
      first_name: row.firstName,
      last_name: (row.lastName ?? "").trim() || null,
      phone: row.phone || null,
      email: row.email || null,
      profession: (row.profession ?? "").trim() || null,
      budget_range: (row.budgetRange ?? "").trim() || null,
      interest_zone: (row.interestZone ?? "").trim() || null,
      consintio_comunicaciones: false,
    }))
  );
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/inicio/contactos");
  revalidatePath("/dashboard/inicio");
  return { ok: true, inserted: toInsert.length, skipped };
}
