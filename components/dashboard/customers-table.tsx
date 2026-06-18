"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ChevronRight, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  contact: string;
  stamps: number;
  totalVisits: number;
  lastVisit: string;
  status: "activo" | "inactivo";
}

// Placeholder — reemplazar con query a Supabase
const MOCK_CUSTOMERS: Customer[] = [
  { id: "c01", name: "María González",  contact: "1122334455",         stamps: 7,  totalVisits: 23, lastVisit: "2026-06-17", status: "activo"   },
  { id: "c02", name: "Carlos Pérez",    contact: "carlos@gmail.com",   stamps: 10, totalVisits: 41, lastVisit: "2026-06-18", status: "activo"   },
  { id: "c03", name: "Ana Rodríguez",   contact: "ana@gmail.com",      stamps: 3,  totalVisits: 8,  lastVisit: "2026-06-15", status: "activo"   },
  { id: "c04", name: "Juan Martín",     contact: "1133445566",         stamps: 0,  totalVisits: 1,  lastVisit: "2026-06-18", status: "activo"   },
  { id: "c05", name: "Laura Torres",    contact: "laura@hotmail.com",  stamps: 6,  totalVisits: 17, lastVisit: "2026-06-16", status: "activo"   },
  { id: "c06", name: "Diego Sánchez",   contact: "1144556677",         stamps: 10, totalVisits: 35, lastVisit: "2026-06-18", status: "activo"   },
  { id: "c07", name: "Sofía Ramírez",   contact: "sofi@gmail.com",     stamps: 2,  totalVisits: 6,  lastVisit: "2026-05-30", status: "inactivo" },
  { id: "c08", name: "Martín López",    contact: "1155667788",         stamps: 9,  totalVisits: 29, lastVisit: "2026-06-17", status: "activo"   },
  { id: "c09", name: "Valentina Cruz",  contact: "vale@gmail.com",     stamps: 4,  totalVisits: 12, lastVisit: "2026-06-10", status: "activo"   },
  { id: "c10", name: "Roberto Flores",  contact: "1166778899",         stamps: 1,  totalVisits: 3,  lastVisit: "2026-05-20", status: "inactivo" },
  { id: "c11", name: "Camila Herrera",  contact: "cami@gmail.com",     stamps: 8,  totalVisits: 19, lastVisit: "2026-06-18", status: "activo"   },
  { id: "c12", name: "Federico Núñez",  contact: "1177889900",         stamps: 5,  totalVisits: 14, lastVisit: "2026-06-14", status: "activo"   },
  { id: "c13", name: "Lucía Morales",   contact: "lucia@hotmail.com",  stamps: 0,  totalVisits: 2,  lastVisit: "2026-04-10", status: "inactivo" },
  { id: "c14", name: "Ignacio Vargas",  contact: "1188990011",         stamps: 10, totalVisits: 52, lastVisit: "2026-06-17", status: "activo"   },
  { id: "c15", name: "Paula Méndez",    contact: "paula@gmail.com",    stamps: 3,  totalVisits: 9,  lastVisit: "2026-06-12", status: "activo"   },
];

const STAMPS_TOTAL = 10;

type Filter = "todos" | "activo" | "inactivo" | "completa";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function StampBar({ stamps }: { stamps: number }) {
  const pct = Math.round((stamps / STAMPS_TOTAL) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", stamps >= STAMPS_TOTAL ? "bg-emerald-400" : "bg-amber-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums", stamps >= STAMPS_TOTAL ? "text-emerald-600" : "text-stone-500")}>
        {stamps}/{STAMPS_TOTAL}
      </span>
    </div>
  );
}

export function CustomersTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "todos" ||
      (filter === "activo" && c.status === "activo") ||
      (filter === "inactivo" && c.status === "inactivo") ||
      (filter === "completa" && c.stamps >= STAMPS_TOTAL);

    return matchSearch && matchFilter;
  });

  const totals = {
    todos: MOCK_CUSTOMERS.length,
    activo: MOCK_CUSTOMERS.filter((c) => c.status === "activo").length,
    inactivo: MOCK_CUSTOMERS.filter((c) => c.status === "inactivo").length,
    completa: MOCK_CUSTOMERS.filter((c) => c.stamps >= STAMPS_TOTAL).length,
  };

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "todos",    label: `Todos (${totals.todos})`        },
    { key: "activo",   label: `Activos (${totals.activo})`     },
    { key: "inactivo", label: `Inactivos (${totals.inactivo})` },
    { key: "completa", label: `Tarjeta completa (${totals.completa})` },
  ];

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg bg-white hover:bg-stone-50 transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === key
                ? "bg-amber-100 text-amber-700"
                : "text-stone-500 hover:bg-stone-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">
            No se encontraron clientes con ese criterio.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Sellos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide hidden md:table-cell">Visitas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide hidden lg:table-cell">Última visita</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50 transition-colors group">
                  {/* Cliente */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-700">{initials(c.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 truncate">{c.name}</p>
                        <p className="text-xs text-stone-400 truncate">{c.contact}</p>
                      </div>
                    </div>
                  </td>

                  {/* Sellos */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Stamp className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                      <StampBar stamps={c.stamps} />
                    </div>
                  </td>

                  {/* Visitas */}
                  <td className="px-4 py-3.5 text-stone-600 hidden md:table-cell">
                    {c.totalVisits}
                  </td>

                  {/* Última visita */}
                  <td className="px-4 py-3.5 text-stone-500 hidden lg:table-cell">
                    {formatDate(c.lastVisit)}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                      c.status === "activo"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-500"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        c.status === "activo" ? "bg-emerald-400" : "bg-stone-300"
                      )} />
                      {c.status === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-3.5">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-stone-100">
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-400">
            Mostrando {filtered.length} de {MOCK_CUSTOMERS.length} clientes
          </div>
        )}
      </div>
    </div>
  );
}
