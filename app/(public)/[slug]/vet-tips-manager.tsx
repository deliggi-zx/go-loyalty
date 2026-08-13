"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { createVetTip, deleteVetTip } from "./vet-tips-actions";
import type { VetTipEntry } from "./vet-tips-data";

interface VetTipsManagerProps {
  slug: string;
  orgId: string;
  primaryColor: string;
  tips: VetTipEntry[];
  // Resuelto en el server (page.tsx) a partir del role — mismo criterio
  // que createAccess en vet-community-gallery.tsx: acá solo hay
  // "allowed" u oculto (no existe un caso "login_required" para
  // Consejos, contenido institucional que no tiene sentido invitar a
  // cargar a cualquiera que se loguee).
  canManage: boolean;
}

// Fase 5 Huellitas, punto 3: lista de tips + form de alta simple
// (title + body, sin foto) + borrado — todo admin/vet, sin concepto de
// dueño. Mismo patrón general que VetCommunityGallery pero más chico
// (sin upload a Storage).
export function VetTipsManager({ slug, orgId, primaryColor, tips, canManage }: VetTipsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setFormOpen(true);
    setTitle("");
    setBody("");
    setFormError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!title.trim()) {
      setFormError("Escribí un título.");
      return;
    }
    if (!body.trim()) {
      setFormError("Escribí el texto del consejo.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await createVetTip(slug, orgId, { title: title.trim(), body: body.trim() });
      closeForm();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Algo salió mal, probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(tip: VetTipEntry) {
    if (!confirm("¿Borrar este consejo?")) return;
    startTransition(async () => {
      try {
        await deleteVetTip(slug, orgId, tip.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo borrar.");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {canManage && (
        <div className="flex items-center justify-between">
          <div />
          <button
            type="button"
            onClick={openCreate}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor || "#b98a72" }}
            aria-label="Publicar consejo"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {formOpen && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">Publicar consejo</h2>
            <button type="button" onClick={closeForm} aria-label="Cerrar" className="text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ej: Cepillá a tu perro al menos 2 veces por semana para evitar nudos..."
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-none"
          />

          {formError && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
              {formError}
            </div>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: primaryColor || "#b98a72" }}
          >
            {submitting ? "Publicando..." : "Publicar"}
          </button>
        </div>
      )}

      {tips.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-12">Todavía no hay consejos publicados.</p>
      ) : (
        <div className="space-y-4">
          {tips.map((tip) => (
            <div key={tip.id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-900">{tip.title}</h3>
                {canManage && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(tip)}
                    aria-label="Borrar consejo"
                    className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Borrar
                  </button>
                )}
              </div>
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
