import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// ── Dominios propios de organizaciones → slug interno ────────────────────
// Cuando una org conecta su propio dominio en Vercel, la app sigue
// sirviendo su sitio desde la ruta interna /<slug>, pero sin que esa ruta
// aparezca en la barra del navegador: el middleware reescribe
// dominio-propio.com/loquesea → /<slug>/loquesea.
//
// Para sumar un dominio nuevo alcanza con agregar la entrada acá (apex +
// www). Nada más hardcodeado — el resto de la lógica es genérica.
const DOMAIN_TO_SLUG: Record<string, string> = {
  "kapusta.com.ar": "kapusta",
  "www.kapusta.com.ar": "kapusta",
};

// Rutas que NO pertenecen a una organización puntual (panel, login, POS,
// API, assets). Se sirven igual aunque se entre por un dominio propio —
// no se reescriben.
const APP_LEVEL_PREFIXES = ["/dashboard", "/login", "/pos", "/admin", "/api", "/_next"];

function isAppLevel(pathname: string): boolean {
  return APP_LEVEL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Resuelve, si corresponde, la URL a la que hay que reescribir la
// petición según el hostname. Devuelve null si no hay dominio propio o si
// la ruta no debe tocarse.
function resolveOrgRewrite(request: NextRequest): URL | null {
  const host = (request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "")
    .toLowerCase()
    .split(":")[0];
  const slug = DOMAIN_TO_SLUG[host];
  if (!slug) return null;

  const { pathname } = request.nextUrl;

  // Ya está scopeada (ej. alguien entró a kapusta.com.ar/kapusta/...) o es
  // una ruta de nivel app → no tocar.
  if (isAppLevel(pathname)) return null;
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) return null;

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${slug}` : `/${slug}${pathname}`;
  return url;
}

export async function middleware(request: NextRequest) {
  const rewriteUrl = resolveOrgRewrite(request);
  const makeResponse = () =>
    rewriteUrl ? NextResponse.rewrite(rewriteUrl, { request }) : NextResponse.next({ request });

  let supabaseResponse = makeResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = makeResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
