"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgRequirements } from "./actions";

interface RequirementsOrgData {
  rental_requirements_text: string | null;
  purchase_requirements_text: string | null;
}

interface RequirementsFormProps {
  org: RequirementsOrgData;
}

// Fase Requisitos (Domus): edita los dos textos que muestra el botón
// "Requisitos" de la ficha de propiedad (ver product-detail-actions.tsx),
// elegido según el tipo de operación de esa propiedad. Solo se monta para
// orgSlug === 'domus' (ver page.tsx) — ninguna otra org tiene "venta"/
// "alquiler" como concepto, así que este bloque no tiene sentido genérico
// como ContactForm.
export function RequirementsForm({ org }: RequirementsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rentalText, setRentalText] = useState(org.rental_requirements_text ?? "");
  const [purchaseText, setPurchaseText] = useState(org.purchase_requirements_text ?? "");

  function handleSave() {
    startTransition(async () => {
      await updateOrgRequirements({
        rental_requirements_text: rentalText || null,
        purchase_requirements_text: purchaseText || null,
      });
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Requisitos
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Se muestran en el botón &quot;Requisitos&quot; de cada ficha de propiedad, según sea
          venta o alquiler.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Requisitos para alquilar</label>
          <textarea
            value={rentalText}
            onChange={(e) => setRentalText(e.target.value)}
            rows={5}
            placeholder="Recibo de sueldo, garantía propietaria, DNI..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Requisitos para comprar</label>
          <textarea
            value={purchaseText}
            onChange={(e) => setPurchaseText(e.target.value)}
            rows={5}
            placeholder="DNI, comprobante de ingresos..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar requisitos"}
        </button>
      </div>
    </section>
  );
}
