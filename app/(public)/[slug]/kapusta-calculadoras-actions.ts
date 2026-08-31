"use server";

import { createClient } from "@/lib/supabase/server";

// Calculadoras inmobiliarias de Kapusta (ver kapusta-calculadoras.tsx).
// Scoped a esta org: los dos server actions resuelven el slug "kapusta"
// server-side, no confían en un orgId que llegue del cliente. Domus y el
// resto de las inmobiliarias no llaman acá.
const KAPUSTA_SLUG = "kapusta";

// ─────────────────────────────────────────────────────────────────────────
// Opciones de los selectores (tipo de propiedad + zona/barrio) — derivadas
// del catálogo real de Kapusta. Las usa tanto la página /kapusta/calculadoras
// como el modal del botón flotante (kapusta-calc-modal.tsx), que no tiene
// un server component arriba de donde recibirlas.
// ─────────────────────────────────────────────────────────────────────────

export async function getKapustaCalcOptions(): Promise<{ tipos: string[]; zonas: string[] }> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("id")
    .eq("slug", KAPUSTA_SLUG)
    .maybeSingle();
  if (!org) return { tipos: [], zonas: [] };

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("product_categories").select("name, parent_id").eq("org_id", org.id),
    supabase.from("products").select("specs").eq("org_id", org.id).eq("active", true),
  ]);

  const tipos = Array.from(
    new Set((categories ?? []).filter((c) => c.parent_id).map((c) => c.name))
  ).sort((a, b) => a.localeCompare(b, "es"));

  const zonas = Array.from(
    new Set(
      (products ?? [])
        .map((p) => {
          const barrio = (p.specs as Record<string, unknown> | null)?.["barrio"];
          return typeof barrio === "string" && barrio.trim() ? barrio.trim() : null;
        })
        .filter((z): z is string => !!z)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return { tipos, zonas };
}

// ─────────────────────────────────────────────────────────────────────────
// Calc 2 — Precio por m² / tasación rápida sobre el stock propio de Kapusta
// ─────────────────────────────────────────────────────────────────────────

export interface TasacionInput {
  superficieM2: number;
  tipo: string; // nombre de categoría hoja (Departamentos, Casas, PH, …)
  operacion: string; // "Venta" | "Alquiler"
  zona: string; // "" = cualquiera; si no, un specs.barrio
}

export type TasacionResult =
  | {
      ok: true;
      insufficient: true;
    }
  | {
      ok: true;
      insufficient: false;
      currency: string;
      count: number;
      // true si tuvimos que sacar el filtro de zona para juntar comparables
      widened: boolean;
      // true si el cálculo se apoya en menos de 3 comparables
      lowConfidence: boolean;
      estimate: number;
      low: number;
      high: number;
      avgPerM2: number;
      minPerM2: number;
      maxPerM2: number;
    }
  | { ok: false; error: "invalid" };

function specNumber(specs: Record<string, unknown> | null, key: string): number | null {
  const val = specs?.[key];
  const n = typeof val === "number" ? val : typeof val === "string" ? Number(val) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function specString(specs: Record<string, unknown> | null, key: string): string | null {
  const val = specs?.[key];
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

export async function estimarTasacionKapusta(input: TasacionInput): Promise<TasacionResult> {
  const superficie = Number(input.superficieM2);
  if (!Number.isFinite(superficie) || superficie <= 0 || !input.tipo || !input.operacion) {
    return { ok: false, error: "invalid" };
  }

  const supabase = createClient();

  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("id")
    .eq("slug", KAPUSTA_SLUG)
    .maybeSingle();
  if (!org) return { ok: false, error: "invalid" };

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("products")
      .select("price, currency, specs, category_id")
      .eq("org_id", org.id)
      .eq("active", true),
    supabase.from("product_categories").select("id, name, parent_id").eq("org_id", org.id),
  ]);

  const categoryById = new Map((categoriesData ?? []).map((c) => [c.id, c]));

  // Misma derivación operación/tipo que resolveDomusLabels en
  // product-catalog.tsx: specs.operación gana; si no, el nombre de la
  // categoría raíz. El tipo sale siempre de la categoría hoja.
  interface Comparable {
    perM2: number;
    currency: string;
    barrio: string | null;
  }

  const comparablesBase: Comparable[] = [];
  for (const p of productsData ?? []) {
    const specs = (p.specs as Record<string, unknown> | null) ?? null;
    const leaf = p.category_id ? categoryById.get(p.category_id) : undefined;
    const root = leaf?.parent_id ? categoryById.get(leaf.parent_id) : leaf;
    const tipo = leaf?.name ?? null;
    const operacion = specString(specs, "operación") ?? root?.name ?? null;
    if (tipo !== input.tipo || operacion !== input.operacion) continue;

    const m2 = specNumber(specs, "m2_totales") ?? specNumber(specs, "m2_cubiertos");
    const price = Number(p.price);
    if (!m2 || !Number.isFinite(price) || price <= 0) continue;

    comparablesBase.push({
      perM2: price / m2,
      currency: p.currency ?? "ARS",
      barrio: specString(specs, "barrio"),
    });
  }

  // Zona primero; si no llega a 3, se amplía sacando ese filtro.
  const zona = input.zona.trim().toLowerCase();
  let pool = comparablesBase;
  let widened = false;
  if (zona) {
    const withZona = comparablesBase.filter((c) => (c.barrio ?? "").toLowerCase() === zona);
    if (withZona.length >= 3) {
      pool = withZona;
    } else {
      widened = comparablesBase.length > withZona.length;
      pool = comparablesBase;
    }
  }

  if (pool.length === 0) return { ok: true, insufficient: true };

  // No mezclar monedas: se usa la moneda con más comparables.
  const byCurrency = new Map<string, Comparable[]>();
  for (const c of pool) {
    const list = byCurrency.get(c.currency) ?? [];
    list.push(c);
    byCurrency.set(c.currency, list);
  }
  const [currency, chosen] = Array.from(byCurrency.entries()).sort(
    (a, b) => b[1].length - a[1].length
  )[0];

  const perM2Values = chosen.map((c) => c.perM2);
  const avgPerM2 = perM2Values.reduce((sum, v) => sum + v, 0) / perM2Values.length;
  const minPerM2 = Math.min(...perM2Values);
  const maxPerM2 = Math.max(...perM2Values);

  return {
    ok: true,
    insufficient: false,
    currency,
    count: chosen.length,
    widened,
    lowConfidence: chosen.length < 3,
    estimate: avgPerM2 * superficie,
    low: minPerM2 * superficie,
    high: maxPerM2 * superficie,
    avgPerM2,
    minPerM2,
    maxPerM2,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Calc 3 — Ajuste de alquiler por ICL o por IPC
// ─────────────────────────────────────────────────────────────────────────
//
// Dos índices, a elección del usuario antes de calcular:
//
// - ICL (Índice para Contratos de Locación, Ley 27.551): lo publica el
//   BCRA, valor DIARIO. El endpoint v3.0/monetarias/7988 quedó deprecado
//   (410 Gone); hoy vive en v4.0 bajo idVariable 40. Respuesta:
//     { results: [ { idVariable: 40, detalle: [ { fecha, valor }, ... ] } ] }
//
// - IPC Nivel General Nacional: lo publica el INDEC, valor MENSUAL (base
//   diciembre 2016 = 100). Se consume como serie de índice ya encadenado
//   vía apis.datos.gob.ar (serie 148.3_INIVELNAL_DICI_M_26), así que se
//   aplica la misma fórmula que el ICL (valor en mes A vs mes B) sin tener
//   que encadenar variaciones a mano. Como es mensual, para una fecha a
//   mitad de mes se usa el índice del último mes cerrado publicado, sin
//   interpolar — y se aclara en el resultado.
//
// En los dos casos: alquiler_actualizado = original * (valor_B / valor_A).

const BCRA_ICL_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40";
const ICL_MIN_DATE = "2020-06-30"; // base de la serie ICL (30.6.20 = 1)

const IPC_API_URL = "https://apis.datos.gob.ar/series/api/series/";
const IPC_SERIES_ID = "148.3_INIVELNAL_DICI_M_26"; // IPC Nivel General Nacional, base dic 2016
const IPC_MIN_DATE = "2016-12-01"; // base de la serie IPC

export type IndiceAlquiler = "ICL" | "IPC";

export type AjusteAlquilerResult =
  | {
      ok: true;
      indice: IndiceAlquiler;
      valorInicio: number;
      valorDestino: number;
      // Fecha real del dato usado (para ICL, el día <= fecha pedida; para
      // IPC, el primer día del mes cerrado usado).
      fechaValorInicio: string;
      fechaValorDestino: string;
      factor: number;
      // true para IPC: el dato es mensual y puede no cubrir el mes en curso.
      mensual: boolean;
    }
  | { ok: false; reason: "invalid" | "source_unreachable" | "no_data" };

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(b) - Date.parse(a)) / 86400000;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(Date.parse(ymd) + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function minYmd(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

// Primer día del mes de `ymd`, en "YYYY-MM-01".
function firstOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function addMonths(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthStart(): string {
  return firstOfMonth(todayYmd());
}

// Cantidad de meses de diferencia entre dos "YYYY-MM-01" (b - a).
function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

// Valor cacheado utilizable para `target`: el punto más reciente con
// fecha <= target, siempre que esté "cerca" (<=7 días, para no arrastrar
// un hueco grande) y sea histórico (nunca cambia) o se haya traído hace
// menos de un día (TTL).
async function iclFromCache(
  supabase: ReturnType<typeof createClient>,
  target: string
): Promise<number | null> {
  const { data } = await supabase
    .from("bcra_icl_cache")
    .select("valor, fecha, fetched_at")
    .lte("fecha", target)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  if (daysBetween(data.fecha as string, target) > 7) return null;
  const isHistorical = daysBetween(target, todayYmd()) > 2;
  const freshHours = (Date.now() - Date.parse(data.fetched_at as string)) / 3600000;
  if (isHistorical || freshHours < 24) return Number(data.valor);
  return null;
}

// Un solo fetch al BCRA por el rango pedido; devuelve el detalle ordenado
// descendente y de paso upsertea todo al cache. Lanza si la API no
// responde o devuelve algo inesperado (lo maneja el caller).
async function fetchBcraRange(
  supabase: ReturnType<typeof createClient>,
  desde: string,
  hasta: string
): Promise<{ fecha: string; valor: number }[]> {
  const url = `${BCRA_ICL_URL}?desde=${desde}&hasta=${hasta}&limit=3000`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`BCRA HTTP ${res.status}`);
  const json = (await res.json()) as {
    results?: { detalle?: { fecha: string; valor: number }[] }[];
  };
  const detalle = json.results?.[0]?.detalle ?? [];
  const clean = detalle
    .filter((d) => isYmd(d.fecha) && Number.isFinite(d.valor))
    .map((d) => ({ fecha: d.fecha, valor: Number(d.valor) }));

  if (clean.length > 0) {
    await supabase
      .from("bcra_icl_cache")
      .upsert(
        clean.map((d) => ({ fecha: d.fecha, valor: d.valor, fetched_at: new Date().toISOString() })),
        { onConflict: "fecha" }
      );
  }

  return clean.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}

function pickOnOrBefore(
  dataset: { fecha: string; valor: number }[],
  target: string
): { fecha: string; valor: number } | null {
  // dataset ordenado descendente
  for (const row of dataset) {
    if (Date.parse(row.fecha) <= Date.parse(target)) return row;
  }
  return null;
}

// ── IPC (INDEC vía apis.datos.gob.ar) ────────────────────────────────────

// Valor mensual cacheado utilizable para `monthStart` (primer día del
// mes): el mes más reciente con fecha <= monthStart. Se sirve del cache
// si ese mes ya está "cerrado" (2+ meses atrás → el INDEC ya no lo
// revisa en la práctica) o si se trajo hace menos de un día.
async function ipcFromCache(
  supabase: ReturnType<typeof createClient>,
  monthStart: string
): Promise<{ fecha: string; valor: number } | null> {
  const { data } = await supabase
    .from("indec_ipc_cache")
    .select("valor, fecha, fetched_at")
    .lte("fecha", monthStart)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const closedMonths = monthsBetween(data.fecha as string, currentMonthStart());
  const freshHours = (Date.now() - Date.parse(data.fetched_at as string)) / 3600000;
  if (closedMonths >= 2 || freshHours < 24) {
    return { fecha: data.fecha as string, valor: Number(data.valor) };
  }
  return null;
}

// Un solo fetch a apis.datos.gob.ar por el rango pedido; devuelve la serie
// ordenada descendente y de paso upsertea todos los meses al cache.
// Respuesta: { data: [ ["YYYY-MM-DD", number], ... ] } ascendente.
async function fetchIpcRange(
  supabase: ReturnType<typeof createClient>,
  desdeMonth: string,
  hastaMonth: string
): Promise<{ fecha: string; valor: number }[]> {
  const url = `${IPC_API_URL}?ids=${IPC_SERIES_ID}&start_date=${desdeMonth}&end_date=${hastaMonth}&format=json&limit=5000`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`INDEC/datos.gob.ar HTTP ${res.status}`);
  const json = (await res.json()) as { data?: [string, number][] };
  const clean = (json.data ?? [])
    .filter(([fecha, valor]) => isYmd(fecha) && Number.isFinite(valor) && valor > 0)
    .map(([fecha, valor]) => ({ fecha: firstOfMonth(fecha), valor: Number(valor) }));

  if (clean.length > 0) {
    await supabase
      .from("indec_ipc_cache")
      .upsert(
        clean.map((d) => ({ fecha: d.fecha, valor: d.valor, fetched_at: new Date().toISOString() })),
        { onConflict: "fecha" }
      );
  }

  return clean.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}

// ── Entrada única de la calculadora de ajuste ────────────────────────────

export async function getAjusteAlquilerKapusta(
  indice: IndiceAlquiler,
  fechaInicio: string,
  fechaDestino: string
): Promise<AjusteAlquilerResult> {
  if (!isYmd(fechaInicio) || !isYmd(fechaDestino)) return { ok: false, reason: "invalid" };
  if (Date.parse(fechaInicio) >= Date.parse(fechaDestino)) return { ok: false, reason: "invalid" };
  const minDate = indice === "IPC" ? IPC_MIN_DATE : ICL_MIN_DATE;
  if (Date.parse(fechaInicio) < Date.parse(minDate)) return { ok: false, reason: "invalid" };

  const supabase = createClient();

  try {
    if (indice === "IPC") {
      const mInicio = firstOfMonth(fechaInicio);
      const mDestino = firstOfMonth(fechaDestino);

      let a = await ipcFromCache(supabase, mInicio);
      let b = await ipcFromCache(supabase, mDestino);

      if (!a || !b) {
        const dataset = await fetchIpcRange(
          supabase,
          addMonths(mInicio, -2),
          currentMonthStart()
        );
        a = a ?? pickOnOrBefore(dataset, mInicio);
        b = b ?? pickOnOrBefore(dataset, mDestino);
      }

      if (!a || !b || a.valor <= 0) return { ok: false, reason: "no_data" };

      return {
        ok: true,
        indice: "IPC",
        valorInicio: a.valor,
        valorDestino: b.valor,
        fechaValorInicio: a.fecha,
        fechaValorDestino: b.fecha,
        factor: b.valor / a.valor,
        mensual: true,
      };
    }

    // ICL (diario)
    let inicio = await iclFromCache(supabase, fechaInicio);
    let destino = await iclFromCache(supabase, fechaDestino);
    let fechaValorInicio = fechaInicio;
    let fechaValorDestino = minYmd(fechaDestino, todayYmd());

    if (inicio == null || destino == null) {
      const dataset = await fetchBcraRange(
        supabase,
        addDays(fechaInicio, -6),
        minYmd(fechaDestino, todayYmd())
      );
      const a = pickOnOrBefore(dataset, fechaInicio);
      const b = pickOnOrBefore(dataset, fechaDestino);
      if (a) {
        inicio = a.valor;
        fechaValorInicio = a.fecha;
      }
      if (b) {
        destino = b.valor;
        fechaValorDestino = b.fecha;
      }
    }

    if (inicio == null || destino == null || inicio <= 0) {
      return { ok: false, reason: "no_data" };
    }

    return {
      ok: true,
      indice: "ICL",
      valorInicio: inicio,
      valorDestino: destino,
      fechaValorInicio,
      fechaValorDestino,
      factor: destino / inicio,
      mensual: false,
    };
  } catch (err) {
    console.error(`Ajuste alquiler (${indice}) falló:`, err instanceof Error ? err.message : err);
    return { ok: false, reason: "source_unreachable" };
  }
}
