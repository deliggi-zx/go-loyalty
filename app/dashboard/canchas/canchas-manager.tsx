"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Trash2, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCourt, updateCourt, deleteCourt, type CourtPayload } from "./actions";

export interface CourtRow {
  id: string;
  name: string;
  court_type: "f5" | "f7" | "f11";
  photo_url: string | null;
}

const COURT_TYPE_LABELS: Record<CourtRow["court_type"], string> = {
  f5: "Fútbol 5",
  f7: "Fútbol 7",
  f11: "Fútbol 11",
};

interface CanchasManagerProps {
  orgId: string;
  courts: CourtRow[];
}

// Panel básico (Fase 3): listado + alta/edición en un solo formulario, sin
// ruta aparte /nuevo (a diferencia de dashboard/catalogo, que sí la tiene
// porque productos tienen bastantes más campos). Foto: mismo patrón que
// product-images-manager.tsx (upload directo del cliente a Supabase
// Storage, después se guarda solo la URL) pero a un solo archivo — una
// cancha tiene una sola foto, no una galería.
export function CanchasManager({ orgId, courts: initialCourts }: CanchasManagerProps) {
  const router = useRouter();
  const [courts, setCourts] = useState(initialCourts);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [courtType, setCourtType] = useState<CourtRow["court_type"]>("f5");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCourtType("f5");
    setPhotoUrl(null);
    setError(null);
  }

  function startEdit(court: CourtRow) {
    setEditingId(court.id);
    setName(court.name);
    setCourtType(court.court_type);
    setPhotoUrl(court.photo_url);
    setError(null);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("La foto supera el límite de 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `courts/${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("loyalty-content")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(`Error al subir la foto: ${uploadError.message}`);
      setUploading(false);
      e.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("loyalty-content").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
    e.target.value = "";
  }

  function handleSave() {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);

    const payload: CourtPayload = {
      name: name.trim(),
      court_type: courtType,
      photo_url: photoUrl,
    };

    startTransition(async () => {
      if (editingId) {
        await updateCourt(editingId, payload);
      } else {
        await createCourt(payload);
      }
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Borrar esta cancha?")) return;
    setCourts((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteCourt(id);
      if (editingId === id) resetForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Listado */}
      {courts.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {courts.map((court) => (
            <div key={court.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#141c17] border border-stone-200 shrink-0 flex items-center justify-center">
                {court.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={court.photo_url} alt={court.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-5 h-5 text-stone-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{court.name}</p>
                <p className="text-xs text-stone-400">{COURT_TYPE_LABELS[court.court_type]}</p>
              </div>
              <button
                onClick={() => startEdit(court)}
                disabled={isPending}
                className="p-1.5 text-stone-400 hover:text-stone-700 disabled:opacity-50 transition-colors rounded-md hover:bg-stone-100"
                aria-label="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(court.id)}
                disabled={isPending}
                className="p-1.5 text-stone-300 hover:text-red-500 disabled:opacity-50 transition-colors rounded-md hover:bg-red-50"
                aria-label="Borrar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay canchas cargadas todavía.
        </div>
      )}

      {/* Alta / edición */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          {editingId ? "Editar cancha" : "Nueva cancha"}
        </h2>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cancha 1"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Tipo</label>
            <select
              value={courtType}
              onChange={(e) => setCourtType(e.target.value as CourtRow["court_type"])}
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white"
            >
              <option value="f5">Fútbol 5</option>
              <option value="f7">Fútbol 7</option>
              <option value="f11">Fútbol 11</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Foto</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#141c17] border border-stone-200 shrink-0 flex items-center justify-center">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="w-5 h-5 text-stone-300" />
              )}
            </div>
            <label
              className={`flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2.5 cursor-pointer transition-colors
                ${uploading ? "bg-stone-300 pointer-events-none" : "bg-amber-500 hover:bg-amber-600"}`}
            >
              <ImagePlus className="w-4 h-4" />
              {uploading ? "Subiendo..." : "Elegir foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-stone-400">
            Opcional — sin foto, la cancha muestra un ícono de reemplazo en el sitio público.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSave}
            disabled={isPending || uploading}
            className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cancha"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              disabled={isPending}
              className="text-sm font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50 transition-colors"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
