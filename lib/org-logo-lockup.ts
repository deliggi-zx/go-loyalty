// Mapa slug → path de logo estático en public/, compartido por el sitio
// público (app/(public)/[slug]/layout.tsx, banner/header) y el panel
// admin (components/dashboard/sidebar.tsx, Fase sidebar responsive) —
// antes vivía como const local del layout público; se movió acá cuando
// el panel admin necesitó el mismo dato, para no duplicar el mapa en dos
// archivos. `loyalty_organizations.logo_url` sigue sin usarse en ningún
// lado (confirmado por grep) — este es el mecanismo real de logo hoy.
export const ORG_LOGO_LOCKUP: Record<string, string> = {
  superelectro: "/superelectro/superelectro-logo-completo.png",
  // Fase logo Domus: isotipo (D→casa) + wordmark + tagline "Soluciones
  // Inmobiliarias", fondo marfil — coincide con background_color de la
  // org, mismo criterio que el resto de este mapa.
  domus: "/domus/domus-logo-completo.png",
  // Kapusta (clon de Domus, mismas funciones de Inmo Pro, marca propia):
  // isotipo todavía no vectorizado — placeholder simple (pin + wordmark)
  // en SVG hasta que llegue el archivo final, mismo criterio que el resto
  // de este mapa (solo cambia el path del asset).
  kapusta: "/kapusta/kapusta-logo-completo.svg",
};
