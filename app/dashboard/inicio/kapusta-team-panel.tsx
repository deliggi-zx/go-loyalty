"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMorningSummary } from "./domus-morning-summary-actions";
import { GENERIC_SUMMARY_TEXTS } from "./morning-summary-constants";
import type { KapustaPanelData } from "./kapusta-panel-data";

// Panel del equipo de Kapusta rediseñado — ver handoff/KAPUSTA_PANEL_SPEC.md.
// Se renderiza SOLO cuando slug === "kapusta" (ver DomusAgentPanel); Domus y
// el resto de las inmobiliarias siguen con el panel de 5 botones de siempre.
//
// Principios del spec: marca celeste + negro (nada de arena ni petróleo de
// fondo), cada destino muestra su número, sin la palabra "agente" de cara
// al usuario, sin bloques vacíos.

// Colores que NO viven en loyalty_organizations (derivados del logo / la
// paleta del spec §2). Los de marca (celeste, petróleo, petróleo claro)
// llegan por props, leídos como org.primary_color ?? "#005F77" etc.
const NEGRO = "#0B1417";
const CELESTE_CLARO = "#BFE6F3";
const SUPERFICIE = "#F8FAFB";
const TXT_SECUNDARIO = "#55666D";
const TXT_TERCIARIO = "#7A888D";
const LINEA = "#E4EAEC";

const UNIDADES = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

function enPalabras(n: number): string {
  return n >= 1 && n <= 9 ? UNIDADES[n] : String(n);
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface KapustaTeamPanelProps {
  orgId: string;
  userName: string | null;
  data: KapustaPanelData;
  primaryColor: string; // petróleo
  secondaryColor: string; // petróleo claro
  backgroundColor: string; // celeste marca
}

export function KapustaTeamPanel({
  orgId,
  userName,
  data,
  primaryColor,
  backgroundColor,
}: KapustaTeamPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Hola");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    getMorningSummary(orgId).then((text) => {
      if (!cancelled) setSummary(text);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Spec §3.2: si el resumen viene genérico ("todo tranquilo") o falló la
  // IA, mostrar una línea corta con el conteo real en su lugar.
  function fallbackLine(): string {
    if (data.consultasSinAsignar > 0) {
      const n = data.consultasSinAsignar;
      return `${capitalizar(enPalabras(n))} ${n === 1 ? "consulta espera" : "consultas esperan"} respuesta.`;
    }
    if (data.visitasHoy > 0) {
      const n = data.visitasHoy;
      return `${capitalizar(enPalabras(n))} ${n === 1 ? "visita confirmada" : "visitas confirmadas"} para hoy.`;
    }
    if (data.ofertasReservasNuevas > 0) {
      const n = data.ofertasReservasNuevas;
      return `${capitalizar(enPalabras(n))} ${n === 1 ? "novedad" : "novedades"} en ofertas y reservas.`;
    }
    return "Sin pendientes urgentes por ahora.";
  }

  const resumenText =
    summary && !GENERIC_SUMMARY_TEXTS.includes(summary) ? summary : fallbackLine();
  const resumenLoading = summary === null;

  const firstName = userName?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor }}>
      {/* Header: wordmark en fuente del sistema (spec §3.1). El lockup PNG
          real trae su propio fondo celeste distinto al del panel y acá,
          sobre /kapusta/perfil, ya aparece completo en el banner del
          sitio justo arriba — repetirlo daría dos logos pegados. En
          /dashboard/inicio y /dashboard mobile, donde el panel es toda la
          pantalla, el wordmark alcanza como encabezado. */}
      <div className="px-5 pt-5 pb-1">
        <span
          className="text-base font-extrabold"
          style={{ color: NEGRO, letterSpacing: "-0.02em" }}
        >
          Kapusta <span className="font-semibold">Propiedades</span>
        </span>
      </div>

      {/* Saludo + resumen (sobre celeste, sin tarjeta contenedora) */}
      <div className="px-5 pt-3 pb-5">
        <h1
          className="font-extrabold"
          style={{
            color: NEGRO,
            fontSize: "32px",
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
          }}
        >
          {firstName ? (
            <>
              {greeting},
              <br />
              {firstName}
            </>
          ) : (
            greeting
          )}
        </h1>
        <div className="mt-3 max-w-[300px]">
          {resumenLoading ? (
            <div className="space-y-2 animate-pulse" aria-label="Cargando resumen del día">
              <div className="h-3 rounded w-full" style={{ backgroundColor: "#8fcfe6" }} />
              <div className="h-3 rounded w-3/5" style={{ backgroundColor: "#8fcfe6" }} />
            </div>
          ) : (
            <p className="text-[15px] leading-[1.45]" style={{ color: "#103038" }}>
              {resumenText}
            </p>
          )}
        </div>
      </div>

      {/* Hoja inferior */}
      <div
        className="flex-1 px-5 pt-6 pb-8 space-y-3"
        style={{ backgroundColor: SUPERFICIE, borderRadius: "28px 28px 0 0" }}
      >
        {/* a) dos tarjetas métricas */}
        <div className="flex gap-3">
          <MetricCard
            href="/dashboard/inicio/consultas"
            value={data.consultasSinAsignar}
            label="Consultas"
            valueColor={backgroundColor}
            labelColor="#FFFFFF"
            bg={NEGRO}
          />
          <MetricCard
            href="/dashboard/inicio/reuniones"
            value={data.visitasHoy}
            label="Visitas hoy"
            valueColor="#FFFFFF"
            labelColor={CELESTE_CLARO}
            bg={primaryColor}
          />
        </div>

        {/* b) tres filas */}
        <PanelRow
          href="/dashboard/inicio/ofertas-reservas"
          title="Ofertas y reservas"
          count={data.ofertasReservasNuevas}
          pendingLabel={`${data.ofertasReservasNuevas} ${
            data.ofertasReservasNuevas === 1 ? "nueva" : "nuevas"
          }`}
          restLabel="Sin novedades"
          chipBg={backgroundColor}
        />
        <PanelRow
          href="/dashboard/inicio/seguimiento"
          title="Seguimiento"
          count={0}
          restLabel={`${data.seguimientosEnCurso} en curso`}
          chipBg={backgroundColor}
        />
        <PanelRow
          href="/dashboard/inicio/contactos"
          title="Cartera de clientes"
          count={0}
          restLabel={`${data.fichasCartera} ${data.fichasCartera === 1 ? "ficha" : "fichas"}`}
          chipBg={backgroundColor}
        />

        {/* c) próxima visita — solo si hay */}
        {data.proximaVisita && (
          <div
            className="mt-1 flex items-center justify-between"
            style={{ borderTop: `1px solid ${LINEA}`, paddingTop: "14px" }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: TXT_TERCIARIO, letterSpacing: "0.14em" }}
              >
                Próxima visita
              </span>
              <span className="text-[15px] font-semibold truncate" style={{ color: "#10262E" }}>
                {data.proximaVisita.titulo}
                {data.proximaVisita.zona ? ` · ${data.proximaVisita.zona}` : ""}
              </span>
            </div>
            <span
              className="text-[18px] font-extrabold shrink-0 pl-3"
              style={{ color: primaryColor, letterSpacing: "-0.02em" }}
            >
              {data.proximaVisita.hora}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  href,
  value,
  label,
  valueColor,
  labelColor,
  bg,
}: {
  href: string;
  value: number;
  label: string;
  valueColor: string;
  labelColor: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col gap-5 rounded-[18px] p-4 active:opacity-90 transition-opacity"
      style={{ backgroundColor: bg }}
    >
      <span
        className="font-extrabold leading-none"
        style={{ color: valueColor, fontSize: "40px", letterSpacing: "-0.04em" }}
      >
        {value}
      </span>
      <span
        className="text-[14px] font-bold uppercase"
        style={{ color: labelColor, letterSpacing: "0.04em" }}
      >
        {label}
      </span>
    </Link>
  );
}

function PanelRow({
  href,
  title,
  count,
  pendingLabel,
  restLabel,
  chipBg,
}: {
  href: string;
  title: string;
  count: number;
  pendingLabel?: string;
  restLabel: string;
  chipBg: string;
}) {
  const showChip = count > 0 && pendingLabel;
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[18px] bg-white px-[18px] py-4 active:opacity-90 transition-opacity"
      style={{ border: `1.5px solid ${NEGRO}` }}
    >
      <span className="text-[16px] font-bold" style={{ color: NEGRO }}>
        {title}
      </span>
      <span className="flex items-center gap-2.5">
        {showChip ? (
          <span
            className="text-[12px] font-bold rounded-[20px] px-2 py-[3px]"
            style={{ backgroundColor: chipBg, color: NEGRO }}
          >
            {pendingLabel}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: TXT_SECUNDARIO }}>
            {restLabel}
          </span>
        )}
        <span className="text-[18px]" style={{ color: NEGRO }}>
          ›
        </span>
      </span>
    </Link>
  );
}
