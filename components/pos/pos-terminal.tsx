"use client";

import { useState, useRef } from "react";
import { Search, CheckCircle2, XCircle, Plus, Gift, ArrowLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const STAMPS_TO_REWARD = 10;

interface Customer {
  id: string;
  name: string;
  query: string;
  stamps: number;
  totalVisits: number;
}

// Datos demo — reemplazar con queries a Supabase
const MOCK_DB: Record<string, Customer> = {
  "1122334455": { id: "c1", name: "María González", query: "1122334455", stamps: 7, totalVisits: 23 },
  "9988776655": { id: "c2", name: "Carlos Pérez", query: "9988776655", stamps: 10, totalVisits: 41 },
  "ana@gmail.com": { id: "c3", name: "Ana Rodríguez", query: "ana@gmail.com", stamps: 3, totalVisits: 8 },
};

type Screen = "idle" | "loading" | "found" | "not-found" | "success-stamp" | "success-redeem";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function StampGrid({ stamps, total = STAMPS_TO_REWARD }: { stamps: number; total?: number }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < stamps;
        return (
          <div
            key={i}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              filled
                ? "bg-amber-400 shadow-sm"
                : "bg-white border-2 border-stone-200"
            )}
          >
            {filled && (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PosTerminal() {
  const [query, setQuery] = useState("");
  const [screen, setScreen] = useState<Screen>("idle");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setScreen("loading");
    setTimeout(() => {
      const found = MOCK_DB[query.trim().toLowerCase()];
      if (found) {
        setCustomer({ ...found });
        setScreen("found");
      } else {
        setScreen("not-found");
      }
    }, 600);
  }

  function handleAddStamp(count: number) {
    if (!customer) return;
    const newStamps = Math.min(customer.stamps + count, STAMPS_TO_REWARD);
    setCustomer((c) => c ? { ...c, stamps: newStamps } : c);
    setScreen("success-stamp");
    setTimeout(() => setScreen("found"), 2000);
  }

  function handleRedeem() {
    if (!customer) return;
    setCustomer((c) => c ? { ...c, stamps: 0, totalVisits: c.totalVisits + 1 } : c);
    setScreen("success-redeem");
    setTimeout(() => setScreen("found"), 2500);
  }

  function reset() {
    setScreen("idle");
    setQuery("");
    setCustomer(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const canRedeem = customer && customer.stamps >= STAMPS_TO_REWARD;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12m0-9C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-stone-900">Go Loyalty</span>
            <span className="ml-2 text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              POS
            </span>
          </div>
        </div>
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* ── IDLE / SEARCH ── */}
          {(screen === "idle" || screen === "loading" || screen === "not-found") && (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-stone-900">Terminal de sellos</h1>
                <p className="text-stone-500 text-sm">Ingresá el teléfono o email del cliente</p>
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej: 1122334455 o cliente@email.com"
                    autoFocus
                    className="w-full h-14 pl-12 pr-4 text-base rounded-xl border-2 border-stone-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={screen === "loading" || !query.trim()}
                  className="w-full h-14 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base rounded-xl transition-colors"
                >
                  {screen === "loading" ? "Buscando..." : "Buscar cliente"}
                </button>
              </form>

              {screen === "not-found" && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Cliente no encontrado</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      No existe un cliente con ese dato. Verificá e intentá de nuevo.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── FOUND ── */}
          {(screen === "found" || screen === "success-stamp" || screen === "success-redeem") && customer && (
            <>
              {/* Success overlay */}
              {(screen === "success-stamp" || screen === "success-redeem") && (
                <div className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl py-8 text-center",
                  screen === "success-stamp" ? "bg-amber-50 border-2 border-amber-200" : "bg-emerald-50 border-2 border-emerald-200"
                )}>
                  <CheckCircle2 className={cn("w-12 h-12", screen === "success-stamp" ? "text-amber-500" : "text-emerald-500")} />
                  <div>
                    <p className={cn("text-lg font-bold", screen === "success-stamp" ? "text-amber-700" : "text-emerald-700")}>
                      {screen === "success-stamp" ? "¡Sello registrado!" : "¡Premio canjeado!"}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {screen === "success-stamp"
                        ? `${customer.name} ahora tiene ${customer.stamps}/${STAMPS_TO_REWARD} sellos`
                        : `${customer.name} canjeó su premio exitosamente`}
                    </p>
                  </div>
                </div>
              )}

              {/* Customer card */}
              {screen === "found" && (
                <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
                  {/* Customer info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-700 font-bold text-lg">{initials(customer.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 text-lg truncate">{customer.name}</p>
                      <p className="text-sm text-stone-400">{customer.totalVisits} visitas totales</p>
                    </div>
                    <button
                      onClick={reset}
                      className="p-2 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                      title="Buscar otro cliente"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stamp progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-stone-600">Tarjeta de sellos</span>
                      <span className={cn(
                        "text-sm font-bold",
                        canRedeem ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {customer.stamps}/{STAMPS_TO_REWARD} sellos
                      </span>
                    </div>
                    <StampGrid stamps={customer.stamps} />
                    {canRedeem && (
                      <p className="text-xs text-center text-emerald-600 font-medium">
                        ¡Tarjeta completa! El cliente puede canjear su premio.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {screen === "found" && (
                <div className="space-y-3">
                  {canRedeem ? (
                    <button
                      onClick={handleRedeem}
                      className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-3"
                    >
                      <Gift className="w-6 h-6" />
                      Canjear premio
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAddStamp(1)}
                        className="h-16 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        1 sello
                      </button>
                      <button
                        onClick={() => handleAddStamp(2)}
                        className="h-16 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        2 sellos
                      </button>
                    </div>
                  )}
                  <button
                    onClick={reset}
                    className="w-full h-12 border-2 border-stone-200 hover:border-stone-300 text-stone-600 font-medium rounded-xl transition-colors text-sm"
                  >
                    Buscar otro cliente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
