"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Fase fidelización Kapusta: QR imprimible que apunta a la página de
// bienvenida (/bienvenida en el dominio propio). Se genera en el browser
// —`qrcode` es isomórfico— a partir de la URL que arma la page; no se
// guarda nada, así que si mañana cambia la URL alcanza con volver a entrar
// acá y descargarlo de nuevo.
export function WelcomeQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">QR de bienvenida</h2>
        <p className="text-xs text-stone-400">
          Imprimilo y ponelo en la oficina. Quien lo escanee llega a la página de
          registro y suma sus primeros Puntos Kapusta.
        </p>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-32 h-32 shrink-0 rounded-lg border border-stone-200 bg-white p-2 flex items-center justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR de bienvenida" className="w-full h-full" />
          ) : (
            <span className="text-[10px] text-stone-400 text-center">
              {error ? "No se pudo generar" : "Generando…"}
            </span>
          )}
        </div>

        <div className="space-y-2 min-w-0">
          <p className="text-xs text-stone-500 break-all">{url}</p>
          {dataUrl && (
            <a
              href={dataUrl}
              download="kapusta-bienvenida-qr.png"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Descargar QR de bienvenida
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
