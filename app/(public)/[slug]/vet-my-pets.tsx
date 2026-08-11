"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Camera, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { linkPetByCode, updateMyPetPhoto } from "./vet-pets-actions";
import type { MyPet } from "./vet-pets-data";

interface VetMyPetsProps {
  slug: string;
  orgId: string;
  pets: MyPet[];
  primaryColor: string;
}

// Bloque "Mis Mascotas" (punto 3, Fase 1 Huellitas) — vive en /perfil,
// aparte del bloque de puntos/historial de arriba (pedido explícito: "no
// mezclado con puntos/datos personales"). El dueño NUNCA crea ni edita la
// ficha (eso es el panel /dashboard/mascotas, admin/vet) — acá solo puede
// (a) vincular una mascota existente con un código, (b) cambiarle la
// foto a una ya vinculada. Nada más es editable desde acá a propósito.
export function VetMyPets({ slug, orgId, pets, primaryColor }: VetMyPetsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [code, setCode] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPetIdRef = useRef<string | null>(null);

  function handleLinkSubmit() {
    if (!code.trim() || isPending) return;
    setLinkError(null);

    startTransition(async () => {
      const result = await linkPetByCode(slug, orgId, code.trim());
      if (!result.ok) {
        setLinkError(
          result.error === "already_linked"
            ? "Esta mascota ya está vinculada a otra cuenta."
            : "Código inválido."
        );
        return;
      }
      setCode("");
      setShowLinkForm(false);
      router.refresh();
    });
  }

  function handlePhotoClick(petId: string) {
    if (uploadingId) return;
    pendingPetIdRef.current = petId;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const petId = pendingPetIdRef.current;
    e.target.value = "";
    if (!file || !petId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La foto supera el límite de 5 MB.");
      return;
    }

    setUploadingId(petId);

    // Ruta fija por mascota (pet-photos/{org_id}/{pet_id}.jpg, pedido
    // explícito — mismo criterio que hero-videos/branding) en vez de un
    // nombre único por upload: la foto de una mascota se reemplaza, no se
    // acumula historial. upsert:true para poder pisarla.
    const path = `pet-photos/${orgId}/${petId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("loyalty-content")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingId(null);
      alert(`No se pudo subir la foto: ${uploadError.message}`);
      return;
    }

    const { data } = supabase.storage.from("loyalty-content").getPublicUrl(path);

    startTransition(async () => {
      try {
        await updateMyPetPhoto(petId, data.publicUrl, slug);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo guardar la foto.");
      } finally {
        setUploadingId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Mis Mascotas
        </h2>
        <button
          onClick={() => {
            setShowLinkForm((s) => !s);
            setLinkError(null);
          }}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {showLinkForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showLinkForm ? "Cancelar" : "Vincular"}
        </button>
      </div>

      {showLinkForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
          <label className="text-xs text-stone-500">
            Código que te compartió tu veterinario
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
              placeholder="Ej: NMFZTFSD"
              maxLength={8}
              className="flex-1 h-10 px-3 text-sm font-mono tracking-widest rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 transition-colors"
            />
            <button
              onClick={handleLinkSubmit}
              disabled={isPending || !code.trim()}
              className="shrink-0 h-10 px-4 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending ? "..." : "Confirmar"}
            </button>
          </div>
          {linkError && <p className="text-xs text-red-600">{linkError}</p>}
        </div>
      )}

      {pets.length === 0 && (
        <div className="bg-white border border-dashed border-stone-200 rounded-xl py-8 px-4 text-center text-sm text-stone-400">
          Tu veterinario va a cargar la ficha de tu mascota, o vinculala acá con el código que te
          compartió.
        </div>
      )}

      {pets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white border border-stone-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => handlePhotoClick(pet.id)}
                disabled={uploadingId === pet.id}
                aria-label={`Cambiar foto de ${pet.name}`}
                className="relative w-full aspect-square bg-stone-100 flex items-center justify-center group"
              >
                {pet.photoUrl ? (
                  // Cache-busting con updatedAt: la ruta de Storage es fija
                  // por mascota (upsert), así que sin esto el navegador
                  // podría seguir mostrando la foto vieja cacheada después
                  // de cambiarla.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${pet.photoUrl}?t=${encodeURIComponent(pet.updatedAt)}`}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PawPrint className="w-8 h-8 text-stone-300" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  {uploadingId === pet.id ? (
                    <span className="text-xs text-white font-medium">Subiendo...</span>
                  ) : (
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>
              <div className="p-3 space-y-0.5">
                <p className="text-sm font-semibold text-stone-900 truncate">{pet.name}</p>
                <p className="text-xs text-stone-500 truncate">
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ""}
                </p>
                {pet.ageLabel && <p className="text-xs text-stone-400">{pet.ageLabel}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
