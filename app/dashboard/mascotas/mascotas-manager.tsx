"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, PawPrint, Pencil } from "lucide-react";
import {
  createPet,
  updatePet,
  createMedicalRecord,
  updateMedicalRecord,
  type PetPayload,
  type MedicalRecordPayload,
} from "./actions";

export interface PetRow {
  id: string;
  ownerProfileId: string | null;
  ownerName: string | null;
  linkCode: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  weight: number | null;
  birthDate: string | null;
  photoUrl: string | null;
}

export interface MemberOption {
  profileId: string;
  name: string | null;
}

// Fase 2: historial clínico — todas las entradas de todas las mascotas de
// la org llegan de una (ver mascotas/page.tsx), este componente filtra
// por petId al vuelo cuando hay una mascota en edición.
export interface MedicalRecordRow {
  id: string;
  petId: string;
  type: "vacuna" | "tratamiento";
  description: string;
  date: string;
  notes: string | null;
  visibleToOwner: boolean;
}

interface MascotasManagerProps {
  pets: PetRow[];
  members: MemberOption[];
  medicalRecords: MedicalRecordRow[];
}

// Solo por nombre — public.profiles no tiene columna email, ver nota en
// mascotas/page.tsx. Si el vet no encuentra al dueño por nombre, igual
// puede guardar la mascota sin vincular y vincularla después editando.
function memberLabel(m: MemberOption): string {
  return m.name ?? `Socio ${m.profileId.slice(0, 8)}`;
}

const emptyForm = {
  name: "",
  species: "",
  breed: "",
  color: "",
  weight: "",
  birthDate: "",
  ownerProfileId: "",
};

// Panel admin/vet (Fase 1 Huellitas, punto 2): el dueño NUNCA crea ni edita
// mascotas acá — solo admin/vet, desde este panel. El dueño se vincula
// después, por su cuenta, con el link_code que se genera al crear (ver
// createPet en actions.ts) — de ahí que la confirmación tras guardar una
// mascota nueva sea justamente mostrar ese código con un botón "Copiar"
// bien visible, es lo primero que el vet necesita para pasárselo.
// NOTA: acá "pets" es directamente la prop (server component, re-fetchea
// en cada request), sin copiarla a useState — se probó copiarla y quedaba
// stale después de router.refresh(): el prop se actualiza pero un
// useState(initialPets) solo lee su argumento en el mount inicial, así
// que la mascota recién creada no aparecía en el listado hasta un reload
// completo de la página. Sin mutación optimista propia acá (no hay borrado
// en este panel), no hace falta estado local para la lista.
const emptyRecordForm = {
  type: "vacuna" as "vacuna" | "tratamiento",
  description: "",
  date: "",
  notes: "",
  visibleToOwner: true,
};

export function MascotasManager({ pets, members, medicalRecords }: MascotasManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justCreatedCode, setJustCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Historial clínico de la mascota en edición — sin editingId no hay
  // sección de historial (una mascota recién creada todavía no existe
  // hasta guardarla, no tiene sentido cargarle vacunas antes de eso).
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [recordError, setRecordError] = useState<string | null>(null);

  const petRecords = useMemo(
    () => (editingId ? medicalRecords.filter((r) => r.petId === editingId) : []),
    [editingId, medicalRecords]
  );

  const filteredMembers = useMemo(() => {
    const q = ownerFilter.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => memberLabel(m).toLowerCase().includes(q));
  }, [ownerFilter, members]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setOwnerFilter("");
    setError(null);
    resetRecordForm();
  }

  function startEdit(pet: PetRow) {
    setEditingId(pet.id);
    setForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      color: pet.color ?? "",
      weight: pet.weight != null ? String(pet.weight) : "",
      birthDate: pet.birthDate ?? "",
      ownerProfileId: pet.ownerProfileId ?? "",
    });
    setOwnerFilter("");
    setError(null);
    setJustCreatedCode(null);
    resetRecordForm();
  }

  function resetRecordForm() {
    setShowRecordForm(false);
    setEditingRecordId(null);
    setRecordForm(emptyRecordForm);
    setRecordError(null);
  }

  function startNewRecord() {
    setEditingRecordId(null);
    setRecordForm(emptyRecordForm);
    setRecordError(null);
    setShowRecordForm(true);
  }

  function startEditRecord(record: MedicalRecordRow) {
    setEditingRecordId(record.id);
    setRecordForm({
      type: record.type,
      description: record.description,
      date: record.date,
      notes: record.notes ?? "",
      visibleToOwner: record.visibleToOwner,
    });
    setRecordError(null);
    setShowRecordForm(true);
  }

  function handleSaveRecord() {
    if (!editingId) return;
    if (!recordForm.description.trim() || !recordForm.date) {
      setRecordError("Descripción y fecha son obligatorias.");
      return;
    }
    setRecordError(null);

    const payload: MedicalRecordPayload = {
      type: recordForm.type,
      description: recordForm.description.trim(),
      date: recordForm.date,
      notes: recordForm.notes.trim() || null,
      visible_to_owner: recordForm.visibleToOwner,
    };

    startTransition(async () => {
      try {
        if (editingRecordId) {
          await updateMedicalRecord(editingRecordId, payload);
        } else {
          await createMedicalRecord(editingId, payload);
        }
        resetRecordForm();
        router.refresh();
      } catch (e) {
        setRecordError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function handleSave() {
    if (!form.name.trim() || !form.species.trim()) {
      setError("Nombre y especie son obligatorios.");
      return;
    }
    setError(null);
    setJustCreatedCode(null);

    const payload: PetPayload = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim() || null,
      color: form.color.trim() || null,
      weight: form.weight.trim() ? Number(form.weight) : null,
      birth_date: form.birthDate || null,
      owner_profile_id: form.ownerProfileId || null,
    };

    startTransition(async () => {
      try {
        if (editingId) {
          await updatePet(editingId, payload);
          resetForm();
        } else {
          const created = await createPet(payload);
          setJustCreatedCode(created.link_code);
          setForm(emptyForm);
          setOwnerFilter("");
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const ownerName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((mm) => mm.profileId === id);
    return m ? memberLabel(m) : null;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Listado */}
      {pets.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => startEdit(pet)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{pet.name}</p>
                <p className="text-xs text-stone-400">
                  {pet.species}
                  {pet.ownerName ? ` · ${pet.ownerName}` : " · Sin vincular"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded">
                {pet.linkCode}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay mascotas cargadas todavía.
        </div>
      )}

      {/* Confirmación de alta: el código es lo que el vet le pasa al dueño
          — bien visible, con botón de copiar, hasta que arranque otra
          carga o edite algo. */}
      {justCreatedCode && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
              Mascota creada — código para el dueño
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-900 tracking-widest">
              {justCreatedCode}
            </p>
          </div>
          <button
            onClick={() => handleCopy(justCreatedCode)}
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}

      {/* Alta / edición */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          {editingId ? "Editar mascota" : "Nueva mascota"}
        </h2>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {editingId && (
          <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            Código: <span className="font-mono font-semibold">{pets.find((p) => p.id === editingId)?.linkCode}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Rocky"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Especie *</label>
            <input
              value={form.species}
              onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
              placeholder="Perro"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Raza</label>
            <input
              value={form.breed}
              onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
              placeholder="Labrador"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Color</label>
            <input
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="Dorado"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              placeholder="12.5"
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Dueño: buscador opcional — no hace falta encontrarlo/elegirlo
            para guardar, la mascota queda "Sin vincular" y el dueño se
            asocia después con el código (ver punto 3, vista del dueño). */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">
            Dueño (opcional — por nombre)
          </label>
          <input
            value={form.ownerProfileId ? "" : ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            disabled={!!form.ownerProfileId}
            placeholder="Buscar socio..."
            className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors disabled:bg-stone-50 disabled:text-stone-400"
          />
          {form.ownerProfileId ? (
            <div className="flex items-center justify-between text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-amber-800">{ownerName(form.ownerProfileId)}</span>
              <button
                onClick={() => setForm((f) => ({ ...f, ownerProfileId: "" }))}
                className="text-xs font-medium text-amber-700 hover:text-amber-900"
              >
                Quitar
              </button>
            </div>
          ) : (
            ownerFilter.trim() !== "" && (
              <div className="border border-stone-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-stone-100">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((m) => (
                    <button
                      key={m.profileId}
                      onClick={() => {
                        setForm((f) => ({ ...f, ownerProfileId: m.profileId }));
                        setOwnerFilter("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      {memberLabel(m)}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-stone-400">Sin resultados.</p>
                )}
              </div>
            )
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear mascota"}
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

      {/* Historial clínico (Fase 2) — solo dentro de la edición de una
          mascota ya creada, integrado a este mismo panel (no es pantalla
          aparte, pedido explícito). Sin borrado a propósito: el historial
          no desaparece, solo se puede corregir una entrada mal tipeada. */}
      {editingId && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Historial clínico
            </h2>
            {!showRecordForm && (
              <button
                onClick={startNewRecord}
                className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Nueva entrada
              </button>
            )}
          </div>

          {petRecords.length > 0 ? (
            <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
              {petRecords.map((r) => (
                <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
                      r.type === "vacuna" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {r.type === "vacuna" ? "Vacuna" : "Tratamiento"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900">{r.description}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(`${r.date}T00:00:00`).toLocaleDateString("es-AR")}
                      {!r.visibleToOwner && " · Oculto para el dueño"}
                    </p>
                    {r.notes && <p className="text-xs text-stone-500 mt-0.5">{r.notes}</p>}
                  </div>
                  <button
                    onClick={() => startEditRecord(r)}
                    disabled={isPending}
                    className="shrink-0 p-1.5 text-stone-400 hover:text-stone-700 disabled:opacity-50 transition-colors rounded-md hover:bg-stone-100"
                    aria-label="Editar entrada"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !showRecordForm && <p className="text-xs text-stone-400">Sin entradas todavía.</p>
          )}

          {showRecordForm && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
              {recordError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {recordError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600">Tipo</label>
                  <select
                    value={recordForm.type}
                    onChange={(e) =>
                      setRecordForm((f) => ({
                        ...f,
                        type: e.target.value as "vacuna" | "tratamiento",
                      }))
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
                  >
                    <option value="vacuna">Vacuna</option>
                    <option value="tratamiento">Tratamiento</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600">Fecha *</label>
                  <input
                    type="date"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600">Descripción *</label>
                <input
                  value={recordForm.description}
                  onChange={(e) => setRecordForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Antirrábica"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600">Notas</label>
                <textarea
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={recordForm.visibleToOwner}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, visibleToOwner: e.target.checked }))
                  }
                  className="rounded border-stone-300"
                />
                Visible para el dueño
              </label>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleSaveRecord}
                  disabled={isPending}
                  className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                >
                  {isPending ? "Guardando..." : editingRecordId ? "Guardar cambios" : "Agregar entrada"}
                </button>
                <button
                  onClick={resetRecordForm}
                  disabled={isPending}
                  className="text-sm font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
