"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { addPortfolioClient } from "./actions";

// Botón + modal para cargar un cliente a mano en la Cartera. No depende de
// que la persona tenga cuenta en el sitio — los datos van directo a la
// fila (domus_portfolio_clients).
export function AddClientForm({ glass }: { glass: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [interestZone, setInterestZone] = useState("");
  const [consintio, setConsintio] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setProfession("");
    setBudgetRange("");
    setInterestZone("");
    setConsintio(false);
    setError(null);
    setDone(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await addPortfolioClient({
      firstName,
      lastName,
      phone,
      email,
      profession,
      budgetRange,
      interestZone,
      consintioComunicaciones: consintio,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(
        res.error === "duplicate"
          ? "Ya hay un cliente con ese teléfono o mail en la cartera."
          : res.error === "invalid"
          ? "Cargá al menos el nombre y un dato de contacto (teléfono o mail)."
          : "No tenés permiso para cargar clientes."
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  const inputClass =
    "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors";

  const triggerClass = glass
    ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl kap-glass text-sm font-semibold text-[#0B1417]"
    : "inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        <UserPlus className="w-4 h-4" />
        Agregar cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">Agregar cliente</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-700">Cliente agregado a la cartera.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="h-10 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
                  >
                    Cargar otro
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                  >
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Nombre *</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Apellido</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Teléfono</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="11 2345-6789"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Mail</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      inputMode="email"
                      placeholder="cliente@mail.com"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Profesión</label>
                  <input
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Presupuesto</label>
                    <input
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      placeholder="Ej. USD 80.000 – 120.000"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600">Zona de interés</label>
                    <input
                      value={interestZone}
                      onChange={(e) => setInterestZone(e.target.value)}
                      placeholder="Ej. Palermo, Caballito"
                      className={inputClass}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consintio}
                    onChange={(e) => setConsintio(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300"
                  />
                  <span className="text-xs text-stone-600 leading-snug">
                    Consintió recibir comunicaciones de la inmobiliaria
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !firstName.trim() || (!phone.trim() && !email.trim())}
                  className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {submitting ? "Guardando…" : "Guardar cliente"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
