"use client";

import { usePathname } from "next/navigation";

// Solo se monta cuando isVetOrgSlug(slug) es true (ver layout.tsx) — para
// cualquier otra org este componente ni existe en el árbol, cero JS extra.
// El header/banner/hero-video/ticker estándar de la plantilla [slug] siguen
// intactos en subpáginas (Pet Shop, Perfil, etc.); acá se ocultan
// únicamente en la home (`/${slug}` exacto), que arma su propia pantalla
// bespoke (video full-screen + huellas, ver huellitas-home.tsx). Usa
// usePathname porque layout.tsx (Server Component) no tiene forma de saber
// qué segmento de ruta se está renderizando debajo de children.
export function VetChromeGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === `/${slug}`;

  if (isHome) return null;
  return <>{children}</>;
}
