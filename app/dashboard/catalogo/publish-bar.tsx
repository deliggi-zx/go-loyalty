"use client";

import { CheckCircle2 } from "lucide-react";
import { BackToCatalogLink } from "./back-to-catalog-link";

// Solo se monta cuando ?nuevo=1 (ver productos/[id]/page.tsx) — la
// primera vez que se entra a esta pantalla después de "Crear producto".
// Le da al agente/dueño un cierre explícito del alta ("ya está, andá al
// catálogo") en vez de dejarlo adivinar si con el link genérico "‹
// Catálogo" de arriba alcanza — mismo botón, reusa BackToCatalogLink con
// justPublished siempre true acá (navegación dura, ver ese archivo).
export function PublishBar({ isRealEstate = false }: { isRealEstate?: boolean }) {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {isRealEstate ? "Propiedad cargada" : "Producto cargado"}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Cuando termines de subir las fotos, volvé al catálogo para verla publicada.
          </p>
        </div>
      </div>
      <BackToCatalogLink
        label="Publicar y volver al catálogo"
        justPublished
        variant="button"
      />
    </div>
  );
}
