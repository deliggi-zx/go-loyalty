import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, saveConnection } from "@/lib/google-calendar-oauth";

// Callback de OAuth de Google. Debe coincidir EXACTO con
// GOOGLE_OAUTH_REDIRECT_URI (.../api/google-calendar/callback).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = cookies();
  const cookieState = cookieStore.get("gcal_oauth_state")?.value;
  cookieStore.delete("gcal_oauth_state");

  const back = (q: string) =>
    NextResponse.redirect(new URL(`/dashboard/configuracion?calendar=${q}`, req.url));

  if (oauthError || !code) return back("error");
  if (!state || !cookieState || state !== cookieState) return back("error");

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

  try {
    const { refreshToken, email } = await exchangeCodeForTokens(code);
    await saveConnection(membership.org_id, refreshToken, email, user.id);
    return back("connected");
  } catch (err) {
    console.error("Google Calendar callback:", err instanceof Error ? err.message : err);
    return back("error");
  }
}
