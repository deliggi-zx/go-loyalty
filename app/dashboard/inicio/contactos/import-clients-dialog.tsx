"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { importPortfolioClients } from "./actions";
import {
  TEMPLATE_HEADERS,
  isDuplicate,
  normalizeEmailKey,
  normalizePhoneKey,
  parseCsv,
  rowsFromMatrix,
  toCsv,
  type ImportRow,
} from "./portfolio";

interface Props {
  glass: boolean;
  existingPhones: string[];
  existingEmails: string[];
}

type PreviewRow = ImportRow & {
  status: "nuevo" | "duplicado" | "repetido" | "incompleto";
};

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATUS_LABEL: Record<PreviewRow["status"], string> = {
  nuevo: "Se importa",
  duplicado: "Ya existe",
  repetido: "Repetido en la planilla",
  incompleto: "Faltan datos",
};

const STATUS_CLASS: Record<PreviewRow["status"], string> = {
  nuevo: "bg-emerald-50 text-emerald-700",
  duplicado: "bg-stone-100 text-stone-500",
  repetido: "bg-stone-100 text-stone-500",
  incompleto: "bg-amber-50 text-amber-700",
};

// Botón + modal para importar clientes desde un CSV o Excel. Parsea en el
// cliente, muestra previsualización con el estado de cada fila (nueva /
// duplicada / incompleta) y recién al confirmar manda las nuevas a la
// server action, que igual vuelve a chequear duplicados contra la base.
export function ImportClientsDialog({ glass, existingPhones, existingEmails }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const existingPhoneSet = useMemo(() => new Set(existingPhones), [existingPhones]);
  const existingEmailSet = useMemo(() => new Set(existingEmails), [existingEmails]);

  const preview = useMemo<PreviewRow[]>(() => {
    if (!rows) return [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    return rows.map((r) => {
      let status: PreviewRow["status"];
      if (!r.firstName.trim() || (!r.phone.trim() && !r.email.trim())) {
        status = "incompleto";
      } else if (isDuplicate(r, existingPhoneSet, existingEmailSet)) {
        status = "duplicado";
      } else if (isDuplicate(r, seenPhones, seenEmails)) {
        status = "repetido";
      } else {
        status = "nuevo";
      }
      const pk = normalizePhoneKey(r.phone);
      const ek = normalizeEmailKey(r.email);
      if (pk) seenPhones.add(pk);
      if (ek) seenEmails.add(ek);
      return { ...r, status };
    });
  }, [rows, existingPhoneSet, existingEmailSet]);

  const newCount = preview.filter((r) => r.status === "nuevo").length;

  function reset() {
    setFileName(null);
    setParseError(null);
    setRows(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const example = ["Juan", "Pérez", "11 2345-6789", "juan.perez@mail.com", "Palermo", "USD 120.000"];
    triggerDownload(
      "plantilla-cartera-clientes.csv",
      toCsv([[...TEMPLATE_HEADERS], example]),
      "text/csv;charset=utf-8"
    );
  }

  async function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setRows(null);
    setFileName(file.name);
    try {
      let matrix: string[][];
      const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
      if (isCsv) {
        matrix = parseCsv(await file.text());
      } else {
        // Excel — SheetJS se carga sólo cuando hace falta.
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          blankrows: false,
          raw: false,
          defval: "",
        });
      }
      const parsed = rowsFromMatrix(matrix.map((r) => r.map((c) => String(c ?? ""))));
      if (parsed.length === 0) {
        setParseError(
          "No se encontraron filas. Revisá que la primera fila tenga los encabezados de la plantilla."
        );
        return;
      }
      setRows(parsed);
    } catch {
      setParseError("No se pudo leer el archivo. Probá con un CSV o un Excel (.xlsx).");
    }
  }

  async function confirmImport() {
    if (!rows) return;
    setImporting(true);
    const toSend: ImportRow[] = preview
      .filter((r) => r.status === "nuevo")
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        email: r.email,
        interestZone: r.interestZone,
        budgetRange: r.budgetRange,
        profession: r.profession,
      }));
    const res = await importPortfolioClients(toSend);
    setImporting(false);
    if (!res.ok) {
      setParseError(
        res.error === "empty" ? "No hay filas nuevas para importar." : "No tenés permiso para importar."
      );
      return;
    }
    setResult({ inserted: res.inserted, skipped: res.skipped });
    router.refresh();
  }

  const triggerClass = glass
    ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl kap-glass text-sm font-semibold text-[#0B1417]"
    : "inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm font-semibold text-stone-700 transition-colors";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        <FileSpreadsheet className="w-4 h-4" />
        Importar desde planilla
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">Importar desde planilla</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-700">
                  {result.inserted === 0
                    ? "No se importó ningún cliente nuevo."
                    : result.inserted === 1
                    ? "Se importó 1 cliente."
                    : `Se importaron ${result.inserted} clientes.`}
                  {result.skipped > 0 &&
                    ` Se omitieron ${result.skipped} por estar duplicados o incompletos.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                >
                  Listo
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-2">
                  <p className="text-xs text-stone-600 leading-snug">
                    La planilla tiene que tener estas columnas en la primera fila:{" "}
                    <span className="font-medium text-stone-800">
                      {TEMPLATE_HEADERS.join(", ")}
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar plantilla
                  </button>
                </div>

                <div className="space-y-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className="block w-full text-sm text-stone-600 file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                  />
                  {fileName && <p className="text-xs text-stone-400">{fileName}</p>}
                </div>

                {parseError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {parseError}
                  </p>
                )}

                {preview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">
                      {preview.length} {preview.length === 1 ? "fila" : "filas"} · {newCount} para
                      importar
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-50 text-stone-500 sticky top-0">
                          <tr>
                            <th className="text-left font-medium px-2 py-1.5">Nombre</th>
                            <th className="text-left font-medium px-2 py-1.5">Contacto</th>
                            <th className="text-left font-medium px-2 py-1.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r, i) => (
                            <tr key={i} className="border-t border-stone-100">
                              <td className="px-2 py-1.5 text-stone-700">
                                {[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                              </td>
                              <td className="px-2 py-1.5 text-stone-500">
                                {r.phone || r.email || "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${STATUS_CLASS[r.status]}`}
                                >
                                  {STATUS_LABEL[r.status]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="h-10 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-sm font-medium text-stone-700 transition-colors"
                      >
                        Cambiar archivo
                      </button>
                      <button
                        type="button"
                        onClick={confirmImport}
                        disabled={importing || newCount === 0}
                        className="flex-1 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                      >
                        {importing
                          ? "Importando…"
                          : newCount === 0
                          ? "Nada nuevo para importar"
                          : `Importar ${newCount} ${newCount === 1 ? "cliente" : "clientes"}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
