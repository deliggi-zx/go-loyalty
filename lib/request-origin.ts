import { headers } from "next/headers";

// Origen público real de la request — esquema + host tal como lo escribió
// el usuario en la barra del navegador (kapusta.com.ar, www.kapusta.com.ar,
// go-loyalty.vercel.app, localhost:3000 en dev). Para armar URLs absolutas
// que TIENEN que volver al mismo dominio por el que se entró: el redirectTo
// del mail de recuperación de contraseña, la vuelta de /auth/callback, etc.
//
// Nunca hardcodear un dominio ni leer un NEXT_PUBLIC_SITE_URL fijo: el
// proyecto sirve varias orgs por varios dominios y el link del mail se
// tiene que abrir en el dominio correcto o el flujo PKCE (cookie del code
// verifier atada al dominio) se rompe.
//
// En Vercel el host público llega SIEMPRE en `x-forwarded-host` (el header
// `host` puede ser el de la deployment interna); el esquema, en
// `x-forwarded-proto`. `origin` se usa solo como último recurso (server
// actions lo mandan, route handlers no siempre).
export function getRequestOrigin(): string {
  const h = headers();

  const forwardedHost = h.get("x-forwarded-host") ?? h.get("host");
  if (forwardedHost) {
    const isLocal =
      forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1");
    const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }

  const origin = h.get("origin");
  if (origin) return origin;

  // Fuera del ciclo de una request real no hay forma de saber el dominio.
  return "http://localhost:3000";
}
