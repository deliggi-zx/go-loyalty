// Tema "simil vidrio" (glassmorphism) de la vertical inmobiliaria — ver
// .kap-glass en app/globals.css y app/dashboard/inicio/kapusta-team-panel.tsx.
//
// El estilo es el mismo para las 3 (Inmo Básica / Pro / 360); lo que cambia
// es la paleta: cada organización usa sus propios primary/secondary/
// background_color en vez del celeste de Kapusta hardcodeado. Kapusta pasa
// exactamente los mismos valores que antes estaban en el CSS, así que se
// ve idéntico.

// "#rrggbb" | "#rgb" → "r g b" (espacios, para rgb(R G B / A) en CSS). Si
// no parsea, devuelve null y el caller cae al default del :root.
export function hexToRgbTriple(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const m = hex.trim().replace(/^#/, "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export interface GlassOrgColors {
  primary_color?: string | null;
  secondary_color?: string | null;
  background_color?: string | null;
}

export interface GlassTheme {
  // Para el style={{}} del contenedor: setea las CSS vars que consume
  // .kap-glass (y sus ::before/::after/breathe). Se puede spreadear dentro
  // de un style de React sin problema.
  vars: Record<string, string>;
  // Colores sólidos para los headers de las subpáginas (que no usan
  // .kap-glass sino un color plano).
  headerBg: string;
  headerBorder: string;
}

const KAPUSTA_DEFAULT_GLASS_RGB = "1 128 171"; // #0180AB (secondary de Kapusta)
const KAPUSTA_DEFAULT_HEADER_BG = "#69BDE1";
const KAPUSTA_DEFAULT_HEADER_BORDER = "#4FA6D3";

// Tono más claro del color base, para el resplandor (::after). Mezcla el
// color con blanco. Se hace en CSS con color-mix para no traer una lib de
// color; el fallback del :root es el celeste claro de Kapusta.
function glowFromSecondary(secondary: string | null | undefined): string | null {
  const triple = hexToRgbTriple(secondary);
  if (!triple) return null;
  const [r, g, b] = triple.split(" ").map(Number);
  const lighten = (c: number) => Math.round(c + (255 - c) * 0.62);
  return `${lighten(r)} ${lighten(g)} ${lighten(b)}`;
}

export function glassTheme(org: GlassOrgColors | null | undefined): GlassTheme {
  const glassRgb = hexToRgbTriple(org?.secondary_color) ?? KAPUSTA_DEFAULT_GLASS_RGB;
  const glowRgb = glowFromSecondary(org?.secondary_color) ?? "150 224 248";

  const headerBg = org?.background_color ?? KAPUSTA_DEFAULT_HEADER_BG;
  // Borde: un tono apenas más oscuro/saturado del fondo del header. Para
  // Kapusta (#69BDE1) da un valor muy cercano al #4FA6D3 original.
  const headerBorder = org?.background_color
    ? `color-mix(in srgb, ${org.background_color} 82%, #0b1417)`
    : KAPUSTA_DEFAULT_HEADER_BORDER;

  return {
    vars: {
      "--kap-glass-rgb": glassRgb,
      "--kap-glass-glow-rgb": glowRgb,
      "--kap-header-bg": headerBg,
      "--kap-header-border": headerBorder,
    },
    headerBg,
    headerBorder,
  };
}
