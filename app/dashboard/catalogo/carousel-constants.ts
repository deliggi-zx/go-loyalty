// Fase Ecualizador de carruseles: rango del control de velocidad — 1.5s
// (bastante rápido) a 8s (bastante lento). Módulo aparte (ni "use
// server" ni "use client") porque lo necesitan los dos lados: actions.ts
// para clampear server-side, carousel-manager.tsx para deshabilitar los
// botones +/- en el límite. Un archivo "use server" solo puede exportar
// funciones async, así que estas constantes no pueden vivir ahí.
export const CAROUSEL_SPEED_MIN_MS = 1500;
export const CAROUSEL_SPEED_MAX_MS = 8000;
