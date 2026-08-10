"use client";

import { usePathname } from "next/navigation";

// Solo se monta cuando isCornerOrgSlug(slug) es true (ver layout.tsx) —
// para cualquier otra org este componente ni existe en el árbol. Mismo
// mecanismo que VetChromeGate: oculta header/banner/hero-video/ticker
// estándar únicamente en la home (`/${slug}` exacto), que arma su propia
// pantalla bespoke (ver corner-home.tsx). A diferencia de Huellitas, acá
// el bottom nav (CornerBottomNav) NO pasa por este gate — vive siempre,
// en todas las rutas de Corner, layout.tsx lo monta aparte.
export function CornerChromeGate({
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
