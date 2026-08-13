"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "./login-modal";
import {
  createCommunityPet,
  deleteCommunityPet,
  updateCommunityPet,
} from "./vet-community-pets-actions";
import type { CommunityPetEntry } from "./vet-community-pets-data";
import type { CommunityPetType } from "./vet-community-pets-permissions";

interface VetCommunityGalleryProps {
  slug: string;
  orgId: string;
  type: CommunityPetType;
  primaryColor: string;
  entries: CommunityPetEntry[];
  // Resuelto en el server (page.tsx) a partir del role/sesión — este
  // componente no decide permisos, solo los refleja:
  // - "allowed": el usuario puede cargar, el botón "+" abre el form.
  // - "login_required": el botón "+" existe pero abre el login en vez del
  //   form (caso Perdidos sin sesión, pedido explícito: "con invitación a
  //   loguearse si intenta cargar" — a diferencia de Refugio, que
  //   directamente NO muestra el botón a quien no puede usarlo).
  // - "hidden": no se muestra el botón "+" en absoluto (Refugio para
  //   cualquiera que no sea role refugio/admin).
  createAccess: "allowed" | "login_required" | "hidden";
  formTitle: string;
  descriptionPlaceholder: string;
  emptyStateText: string;
}

type FormState = { mode: "create" } | { mode: "edit"; entry: CommunityPetEntry } | null;

// Galería compartida por Refugio y Perdidos (mismo componente, distinto
// `type` + copy por props) — misma estructura visual pedida ("misma
// estructura visual que Refugio" para Perdidos), toda la diferencia real
// está en `createAccess` y en qué texto le pasa cada page.tsx.
export function VetCommunityGallery({
  slug,
  orgId,
  type,
  primaryColor,
  entries,
  createAccess,
  formTitle,
  descriptionPlaceholder,
  emptyStateText,
}: VetCommunityGalleryProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function openCreate() {
    if (createAccess === "hidden") return;
    if (createAccess === "login_required") {
      setLoginOpen(true);
      return;
    }
    setForm({ mode: "create" });
    setDescription("");
    setFile(null);
    setFormError(null);
  }

  function openEdit(entry: CommunityPetEntry) {
    setForm({ mode: "edit", entry });
    setDescription(entry.description);
    setFile(null);
    setFormError(null);
  }

  function closeForm() {
    setForm(null);
    setFormError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) {
      setFormError("La foto supera el límite de 5 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleSubmit() {
    if (!form || submitting) return;
    if (!description.trim()) {
      setFormError("Escribí una descripción breve.");
      return;
    }
    if (form.mode === "create" && !file) {
      setFormError("Elegí una foto.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const id = form.mode === "create" ? crypto.randomUUID() : form.entry.id;
      let photoUrl: string | undefined;

      // Path fijo por id (pedido explícito): community-pets/{org_id}/
      // {type}/{id}.jpg — mismo criterio que pet-photos/{org_id}/{pet_id}
      // en vet-my-pets.tsx. upsert:true así reemplazar la foto en una
      // edición pisa el mismo archivo en vez de acumular huérfanos.
      if (file) {
        const path = `community-pets/${orgId}/${type}/${id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("loyalty-content")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw new Error(`No se pudo subir la foto: ${uploadError.message}`);
        photoUrl = supabase.storage.from("loyalty-content").getPublicUrl(path).data.publicUrl;
      }

      if (form.mode === "create") {
        await createCommunityPet(slug, orgId, {
          id,
          type,
          photoUrl: photoUrl!,
          description: description.trim(),
        });
      } else {
        await updateCommunityPet(slug, orgId, {
          id: form.entry.id,
          type,
          description: description.trim(),
          photoUrl,
        });
      }

      closeForm();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Algo salió mal, probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(entry: CommunityPetEntry) {
    if (!confirm("¿Borrar esta publicación?")) return;
    startTransition(async () => {
      try {
        await deleteCommunityPet(slug, orgId, type, entry.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo borrar.");
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} primaryColor={primaryColor} orgId={orgId} />

      <div className="flex items-center justify-between">
        <div />
        {createAccess !== "hidden" && (
          <button
            type="button"
            onClick={openCreate}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor || "#b98a72" }}
            aria-label={formTitle}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {form && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">
              {form.mode === "create" ? formTitle : "Editar publicación"}
            </h2>
            <button type="button" onClick={closeForm} aria-label="Cerrar" className="text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {form.mode === "edit" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.entry.photoUrl} alt="" className="w-24 h-24 rounded-lg object-cover" />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
          />
          {form.mode === "edit" && (
            <p className="text-[11px] text-stone-400">Dejalo vacío para mantener la foto actual.</p>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={descriptionPlaceholder}
            rows={3}
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
            {submitting ? "Guardando..." : form.mode === "create" ? "Publicar" : "Guardar cambios"}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-12">{emptyStateText}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.photoUrl} alt="" className="w-full aspect-square object-cover" />
              <div className="p-3 space-y-2">
                <p className="text-xs text-stone-600 line-clamp-3">{entry.description}</p>
                {entry.canEdit && (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(entry)}
                      className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
