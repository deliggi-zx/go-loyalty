import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, isCalendarConfigured } from "@/lib/google-calendar-oauth";

// Inicia el flujo OAuth de Google Calendar. Solo el gerente (role admin)
// de Kapusta puede conectar el calendario compartido de la inmobiliaria.
export async function GET(req: NextRequest) {
  const back = (q: string) =>
    NextResponse.redirect(new URL(`/dashboard/configuracion?calendar=${q}`, req.url));

  if (!isCalendarConfigured()) return back("notconfigured");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role, org_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "admin") return back("forbidden");

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (org?.slug !== "kapusta") return back("forbidden");

  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
