// Textos que devuelve getMorningSummary (domus-morning-summary-actions.ts)
// cuando no hay nada que resumir o cuando Gemini falla. Viven en su propio
// archivo sin imports de servidor para que también los pueda leer un
// componente cliente — el panel rediseñado de Kapusta (kapusta-team-panel.tsx)
// los detecta y los reemplaza por una línea con el conteo real (spec §3.2:
// "en vez de 'Todo tranquilo por ahora'").
export const NOTHING_PENDING_TEXT = "Todo tranquilo por ahora, sin pendientes urgentes.";
export const MORNING_SUMMARY_FALLBACK_TEXT =
  "No pudimos armar el resumen del día, pero tu panel sigue al día más abajo.";
export const GENERIC_SUMMARY_TEXTS = [NOTHING_PENDING_TEXT, MORNING_SUMMARY_FALLBACK_TEXT];
