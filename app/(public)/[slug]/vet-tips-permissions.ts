// Fase 5 Huellitas, punto 3 (Consejos): reglas de permisos, todas acá
// (mismo criterio que vet-community-pets-permissions.ts — permisos a
// nivel de código, la tabla no tiene RLS). Funciones puras, sin acceso a
// datos — se llaman tanto desde el server (page.tsx, para decidir qué
// botones mostrar) como desde la server action (vet-tips-actions.ts,
// para el chequeo real que importa).
//
// A diferencia de Refugio/Perdidos, acá no hay concepto de "dueño" del
// contenido (es institucional) — crear y borrar comparten exactamente el
// mismo criterio: solo role admin o vet de esta org, sin importar quién
// escribió el tip.
export function canManageVetTips(role: string | null): boolean {
  return role === "admin" || role === "vet";
}
