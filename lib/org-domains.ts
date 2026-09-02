// ── Dominios propios de organizaciones → slug interno ────────────────────
// Cuando una org conecta su propio dominio en Vercel, la app sigue
// sirviendo su sitio desde la ruta interna /<slug>, pero sin que esa ruta
// aparezca en la barra del navegador: el middleware reescribe
// dominio-propio.com/loquesea → /<slug>/loquesea.
//
// Para sumar un dominio nuevo alcanza con agregar la entrada acá (apex +
// www). Nada más hardcodeado — el resto de la lógica es genérica.
//
// Vive en su propio archivo (y no en middleware.ts) porque lo consumen
// los dos lados: el middleware para reescribir, y el server (ej.
// reset-password) para decidir si un redirect va a "/" o a "/<slug>"
// según por dónde entró el usuario. Sin dependencias de Node → sirve en
// el runtime Edge del middleware.
export const DOMAIN_TO_SLUG: Record<string, string> = {
  "kapusta.com.ar": "kapusta",
  "www.kapusta.com.ar": "kapusta",
};

// Slug que se sirve en la raíz para este host, o null si el host no es un
// dominio propio de ninguna org (go-loyalty.vercel.app, localhost, etc.).
// Tolera que venga con puerto (localhost:3000) o en mayúsculas.
//
// Recibe el/los header(s) de host crudos y los normaliza igual que el
// middleware: prioriza `host`, cae a `x-forwarded-host`. Usar la MISMA
// resolución en los dos lados es el punto — así el server decide "raíz vs
// /<slug>" exactamente cuando el middleware está reescribiendo.
export function slugForHost(
  host: string | null | undefined,
  forwardedHost?: string | null | undefined
): string | null {
  const normalized = (host ?? forwardedHost ?? "").toLowerCase().split(":")[0];
  if (!normalized) return null;
  return DOMAIN_TO_SLUG[normalized] ?? null;
}

// Base URL pública "canónica" de una org, para embeber en cosas que se
// imprimen o comparten (ej. el QR de bienvenida de Kapusta) y tienen que
// seguir funcionando aunque cambie desde dónde se generan.
//   - Si la org tiene dominio propio → "https://<apex>" (se prefiere el
//     apex sobre el www; el middleware sirve el sitio en la raíz).
//   - Si no → "<fallbackOrigin>/<slug>" (ej. https://go-loyalty.vercel.app/kapusta).
export function publicBaseUrlForSlug(slug: string, fallbackOrigin: string): string {
  const domains = Object.entries(DOMAIN_TO_SLUG)
    .filter(([, s]) => s === slug)
    .map(([d]) => d);
  const apex = domains.find((d) => !d.startsWith("www.")) ?? domains[0];
  if (apex) return `https://${apex}`;
  return `${fallbackOrigin.replace(/\/$/, "")}/${slug}`;
}
