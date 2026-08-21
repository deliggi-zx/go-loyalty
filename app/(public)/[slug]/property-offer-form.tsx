"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createPropertyOffer } from "./domus-offers-actions";

interface PropertyOfferFormProps {
  slug: string;
  orgId: string;
  userId: string;
  primaryColor: string;
}

// Mismo set que las categorías hijas de Venta/Alquiler (ver Fase 0,
// product_categories) — así lo que carga el dueño queda 1 a 1 con lo que
// el agente va a elegir después a mano en /dashboard/catalogo/productos/
// nuevo si decide "sumar al stock" (paso 4 de la Fase 3, no automático).
const PROPERTY_TYPES = [
  "Departamento",
  "Casa",
  "PH",
  "Terreno",
  "Local comercial",
  "Oficina",
  "Cochera",
];

interface UploadedPhoto {
  id: string;
  url: string;
  uploading: boolean;
}

// Fase 3 Domus: mismo patrón de toggle que PropertyVisitBooking/
// GeneralInquiryForm — botón que revela el form. Las fotos se suben a
// Storage apenas se eligen (mismo bucket/mecanismo que
// product-images-manager.tsx, ver domus-offers-actions.ts), no recién al
// enviar — así el dueño ve la miniatura y puede sacarla antes de mandar
// la oferta. La oferta todavía no existe en ese momento (offer_id no
// existe hasta el submit final), por eso acá se junta un array de URLs
// en memoria en vez de llamar a una acción "addOfferPhoto" por foto como
// hace el catálogo con un producto ya creado.
export function PropertyOfferForm({ slug, orgId, userId, primaryColor }: PropertyOfferFormProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [operationType, setOperationType] = useState<"venta" | "alquiler">("venta");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [requestedPrice, setRequestedPrice] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("USD");
  const [rooms, setRooms] = useState("");
  const [totalSurface, setTotalSurface] = useState("");
  const [coveredSurface, setCoveredSurface] = useState("");
  const [amenities, setAmenities] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const supabase = createClient();

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`"${file.name}" supera el límite de 5 MB y no se subió.`);
        continue;
      }

      // Id propio en vez de índice posicional: con varios archivos en el
      // mismo select, cada vuelta del loop lee `photos` del closure (el
      // valor de cuando arrancó handlePhotoSelect, no el estado real ya
      // actualizado por los setPhotos() de vueltas anteriores) — un índice
      // calculado con photos.length pisaría siempre la misma posición.
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const placeholder: UploadedPhoto = { id, url: "", uploading: true };
      setPhotos((prev) => [...prev, placeholder]);

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `property-offers/${orgId}/${userId}/${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setPhotoError(`Error al subir "${file.name}": ${uploadError.message}`);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);

      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, url: publicUrl, uploading: false } : p))
      );
    }

    e.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await createPropertyOffer(slug, orgId, {
      phone,
      operationType,
      propertyType,
      address,
      neighborhood,
      requestedPrice: parseFloat(requestedPrice) || 0,
      currency,
      rooms: rooms.trim() ? parseFloat(rooms) : null,
      totalSurface: totalSurface.trim() ? parseFloat(totalSurface) : null,
      coveredSurface: coveredSurface.trim() ? parseFloat(coveredSurface) : null,
      amenities,
      photoUrls: photos.filter((p) => !p.uploading && p.url).map((p) => p.url),
    });

    setSubmitting(false);

    if (result.ok) {
      setConfirmed(true);
      return;
    }

    setSubmitError("No pudimos enviar tu propiedad. Revisá los datos y probá de nuevo.");
  }

  const inputClass =
    "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors";
  const labelClass = "text-xs font-medium text-stone-600";
  const primaryBtnClass =
    "w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40";
  const secondaryBtnClass =
    "w-full py-3 rounded-xl font-medium border-2 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50";

  const hasPendingUploads = photos.some((p) => p.uploading);
  const canSubmit =
    phone.trim() && address.trim() && requestedPrice.trim() && !hasPendingUploads && !submitting;

  if (confirmed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1 text-center">
        <p className="text-sm font-semibold text-stone-900">¡Listo, la recibimos!</p>
        <p className="text-xs text-stone-500">Un agente se va a poner en contacto.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={secondaryBtnClass}
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        Ofrecer mi propiedad
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-900">Contanos sobre tu propiedad</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Cancelar
        </button>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Teléfono</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej. 11 2345-6789"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>Operación</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value as "venta" | "alquiler")}
            className={`${inputClass} bg-white`}
          >
            <option value="venta">Venta</option>
            <option value="alquiler">Alquiler</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Tipo</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={`${inputClass} bg-white`}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Dirección</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle y altura"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Barrio</label>
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="Opcional"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-[1fr_92px] gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>Precio pedido</label>
          <input
            type="number"
            min="0"
            step="any"
            value={requestedPrice}
            onChange={(e) => setRequestedPrice(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "ARS" | "USD")}
            className={`${inputClass} bg-white px-2`}
          >
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className={labelClass}>Ambientes</label>
          <input
            type="number"
            min="0"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Sup. total</label>
          <input
            type="number"
            min="0"
            value={totalSurface}
            onChange={(e) => setTotalSurface(e.target.value)}
            placeholder="m²"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Sup. cubierta</label>
          <input
            type="number"
            min="0"
            value={coveredSurface}
            onChange={(e) => setCoveredSurface(e.target.value)}
            placeholder="m²"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Comodidades</label>
        <textarea
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          rows={3}
          placeholder='Ej. "Cochera, pileta, parrilla, balcón"'
          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Fotos</label>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0"
              >
                {photo.uploading ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                    Subiendo...
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="Quitar foto"
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg px-3 py-2 cursor-pointer w-fit hover:bg-stone-50 transition-colors">
          <ImagePlus className="w-4 h-4" />
          Agregar fotos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={handlePhotoSelect}
          />
        </label>
        {photoError && <p className="text-xs text-red-600">{photoError}</p>}
      </div>

      {submitError && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {submitError}
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className={primaryBtnClass}
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? "Enviando..." : "Enviar propiedad"}
      </button>
    </div>
  );
}
