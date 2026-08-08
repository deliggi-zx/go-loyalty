"use client";

import Link from "next/link";

export interface SectionNavTabItem {
  label: string;
  /** Ancla en la misma página — hace scroll suave hasta el elemento con este id. */
  targetId?: string;
  /** Navegación real a otra ruta, para secciones que no viven en esta página
   *  (ej. Catálogo → /[slug]/precios). Si viene seteado, gana sobre targetId. */
  href?: string;
  /** Segunda línea opcional, más chica, debajo del título — hoy solo la usa
   *  VerticalGlassTabs (Fase 3e); SectionNavTabs no la renderiza. */
  subtitle?: string;
}

interface SectionNavTabsProps {
  items: SectionNavTabItem[];
}

// Fila horizontal de pestañas de navegación, debajo del bloque de video.
// Reusa el lenguaje visual de NeonTabs (glow lima, tipografía bold/uppercase
// vía la misma variable --neon) pero es un componente aparte, con
// comportamiento distinto: acá cada pestaña siempre muestra su texto (no
// hover-to-reveal) y al tocarla hace scroll suave a una sección más abajo en
// la misma página, o navega a otra ruta si la sección vive en otra página
// (ver `href` en SectionNavTabItem). No toca NeonTabs ni su lógica.
//
// Config-driven por org: ver SECTION_NAV_TABS en layout.tsx — este
// componente no hardcodea pestañas de ninguna org.
export function SectionNavTabs({ items }: SectionNavTabsProps) {
  if (items.length === 0) return null;

  function handleClick(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="section-nav-tabs" aria-label="Navegación de secciones">
      {items.map((item) =>
        item.href ? (
          <Link key={item.label} href={item.href} className="section-nav-tab">
            {item.label}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            className="section-nav-tab"
            onClick={() => item.targetId && handleClick(item.targetId)}
          >
            {item.label}
          </button>
        )
      )}
    </nav>
  );
}
