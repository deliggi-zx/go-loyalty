"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateOrgAppearance } from "./actions";

interface OrgData {
  id: string;
  slug: string | null;
  name: string;
  banner_url: string | null;
  background_url: string | null;
  background_color: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

interface AppearanceFormProps {
  org: OrgData;
}

export function AppearanceForm({ org }: AppearanceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Color state
  const [primaryColor, setPrimaryColor] = useState(org.primary_color ?? "#f59e0b");
  const [secondaryColor, setSecondaryColor] = useState(org.secondary_color ?? "#78716c");
  const [accentColor, setAccentColor] = useState(org.accent_color ?? "#d97706");

  // Background mode
  const [bgMode, setBgMode] = useState<"color" | "image">(
    org.background_url ? "image" : "color"
  );
  const [bgColor, setBgColor] = useState(org.background_color ?? "#fafaf9");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(org.background_url);

  // Upload state
  const [bannerUrl, setBannerUrl] = useState<string | null>(org.banner_url);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function uploadImage(file: File, folder: string): Promise<string | null> {
    setError(null);
    setUploading(folder);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${org.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("loyalty-content")
      .upload(path, file, { upsert: true });

    setUploading(null);

    if (uploadError) {
      setError(`Error al subir imagen: ${uploadError.message}`);
      return null;
    }

    return supabase.storage.from("loyalty-content").getPublicUrl(path).data.publicUrl;
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, "banners");
    if (!url) return;

    setBannerUrl(url);
    startTransition(async () => {
      await updateOrgAppearance({ banner_url: url });
      router.refresh();
    });
  }

  async function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, "backgrounds");
    if (!url) return;

    setBgImageUrl(url);
    startTransition(async () => {
      await updateOrgAppearance({ background_url: url, background_color: null });
      router.refresh();
    });
  }

  function handleBgModeToggle(mode: "color" | "image") {
    setBgMode(mode);
    // Clear the other value when switching
    startTransition(async () => {
      if (mode === "color") {
        await updateOrgAppearance({ background_url: null, background_color: bgColor });
      } else {
        await updateOrgAppearance({ background_color: null, background_url: bgImageUrl });
      }
      router.refresh();
    });
  }

  function handleBgColorChange(color: string) {
    setBgColor(color);
  }

  function handleBgColorSave() {
    startTransition(async () => {
      await updateOrgAppearance({ background_color: bgColor, background_url: null });
      router.refresh();
    });
  }

  function handleColorsSave() {
    startTransition(async () => {
      await updateOrgAppearance({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      });
      router.refresh();
    });
  }

  const isUploading = uploading !== null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Apariencia
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Configurá la imagen y los colores de tu página pública
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Imagen de banner</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Se muestra en la parte superior de tu página pública (ancho completo)
          </p>
        </div>

        {bannerUrl && (
          <div className="relative h-28 rounded-lg overflow-hidden bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="Banner actual" className="w-full h-full object-cover" />
          </div>
        )}

        <label className={`flex items-center gap-2 text-sm font-medium text-stone-600 cursor-pointer
          border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-50 transition-colors w-fit
          ${isUploading && uploading === "banners" ? "opacity-50 pointer-events-none" : ""}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploading === "banners" ? "Subiendo..." : bannerUrl ? "Cambiar imagen" : "Subir imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleBannerUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Background */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Fondo de página</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Color sólido o imagen de fondo para el cuerpo de la página
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1 w-fit">
          {(["color", "image"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleBgModeToggle(mode)}
              disabled={isPending}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                bgMode === mode
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {mode === "color" ? "Color" : "Imagen"}
            </button>
          ))}
        </div>

        {bgMode === "color" ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => handleBgColorChange(e.target.value)}
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
            />
            <span className="text-sm text-stone-600 font-mono">{bgColor}</span>
            <button
              onClick={handleBgColorSave}
              disabled={isPending}
              className="ml-auto text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Guardando..." : "Guardar color"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bgImageUrl && (
              <div className="relative h-24 rounded-lg overflow-hidden bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgImageUrl} alt="Fondo actual" className="w-full h-full object-cover" />
              </div>
            )}
            <label className={`flex items-center gap-2 text-sm font-medium text-stone-600 cursor-pointer
              border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-50 transition-colors w-fit
              ${isUploading && uploading === "backgrounds" ? "opacity-50 pointer-events-none" : ""}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {uploading === "backgrounds" ? "Subiendo..." : bgImageUrl ? "Cambiar imagen" : "Subir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleBgImageUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Colores de marca</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Se usan en botones, sellos y acentos de tu página pública
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Principal", value: primaryColor, set: setPrimaryColor },
            { label: "Secundario", value: secondaryColor, set: setSecondaryColor },
            { label: "Acento", value: accentColor, set: setAccentColor },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs text-stone-500">{label}</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-8 h-8 rounded-md border border-stone-200 cursor-pointer p-0.5 bg-white shrink-0"
                />
                <span className="text-xs text-stone-500 font-mono truncate">{value}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleColorsSave}
          disabled={isPending}
          className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar colores"}
        </button>
      </div>
    </section>
  );
}
