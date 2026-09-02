import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vuelta del link del mail de recuperación de contraseña. Supabase Auth
// verifica el token y redirige acá con ?code=... (flujo PKCE). Cambiamos
// ese code por una sesión y mandamos al usuario a la pantalla de nueva
// contraseña.
//
// Nota: el intercambio del code necesita el "code verifier" que quedó en
// una cookie cuando se pidió el reset — o sea, el link tiene que abrirse
// en el mismo navegador donde se llenó el formulario de "olvidé mi
// contraseña". En otro dispositivo el intercambio falla.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Dominio público real por el que entró el usuario (kapusta.com.ar,
  // go-loyalty.vercel.app…). No usar new URL(req.url).origin: en Vercel
  // puede ser el host de la deployment interna, y si redirigimos
  // /reset-password a OTRO dominio se pierde la cookie del code verifier
  // PKCE (atada al dominio) y el exchange de recién no sirve de nada.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(req.url).origin;

  const fail = () =>
    NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("El link de recuperación no es válido o ya expiró. Pedí uno nuevo.")}`,
        origin
      )
    );

  if (!code) return fail();

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return fail();
  }

  return NextResponse.redirect(new URL(next, origin));
}
