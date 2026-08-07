"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check } from "lucide-react";
import { generateInviteCode } from "./actions";

export interface InviteCodeRow {
  id: string;
  code: string;
  status: "unused" | "used";
  created_at: string;
  used_at: string | null;
  // Nombre del socio que lo usó — siempre null por ahora, porque esta fase
  // todavía no conecta el registro con estos códigos. Se completa solo
  // cuando exista esa fase.
  usedByName: string | null;
}

const CLIPBOARD_FEEDBACK_MS = 1500;

export function InviteCodesManager({ codes }: { codes: InviteCodeRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justGenerated, setJustGenerated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const code = await generateInviteCode();
      setJustGenerated(code);
      router.refresh();
    });
  }

  function handleCopy(id: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), CLIPBOARD_FEEDBACK_MS);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-stone-200 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-800">Generar código nuevo</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Un código, un solo uso. Compartilo por WhatsApp o entregalo en el mostrador.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generar código nuevo
        </button>
      </div>

      {justGenerated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
              Código generado
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-900 tracking-widest">
              {justGenerated}
            </p>
          </div>
          <button
            onClick={() => handleCopy("just-generated", justGenerated)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors"
          >
            {copiedId === "just-generated" ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </>
            )}
          </button>
        </div>
      )}

      {codes.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="font-mono text-sm font-semibold text-stone-800 tracking-wide">
                {c.code}
              </span>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  c.status === "unused"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    c.status === "unused" ? "bg-emerald-400" : "bg-stone-400"
                  }`}
                />
                {c.status === "unused" ? "Sin usar" : "Usado"}
              </span>
              <span className="flex-1 text-xs text-stone-400">
                Creado {new Date(c.created_at).toLocaleDateString("es-AR")}
                {c.used_at &&
                  ` · Usado ${new Date(c.used_at).toLocaleDateString("es-AR")}`}
                {c.usedByName && ` por ${c.usedByName}`}
              </span>
              <button
                onClick={() => handleCopy(c.id, c.code)}
                aria-label="Copiar código"
                className="shrink-0 p-1.5 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
              >
                {copiedId === c.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          Todavía no generaste ningún código.
        </div>
      )}
    </div>
  );
}
