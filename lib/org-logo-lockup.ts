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
  // lockup horizontal definitivo (wordmark KAPUSTA + isotipo + "Propiedades").
  // El PNG viene con fondo celeste de marca (#69BDE1), que coincide con
  // background_color de la org — se funde con el banner del home y con el
  // header del panel de equipo, ambos celeste. Reemplazó al placeholder
  // circular en SVG.
  kapusta: "/kapusta/kapusta-logo-completo.png",
};
