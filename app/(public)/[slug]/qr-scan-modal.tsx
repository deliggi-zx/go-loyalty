"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, XCircle, ScanLine } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { claimEarnTransaction } from "@/lib/loyalty/transactions";

interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

type Status = "scanning" | "claiming" | "success" | "error";

// Extrae el qr_token del contenido leído: si el QR codifica una URL (por
// ejemplo https://.../claim?token=XXX o .../claim/XXX), sacamos el token de
// ahí; si no, tomamos el texto crudo tal cual como token.
function extractToken(raw: string): string {
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get("token");
    if (fromQuery) return fromQuery;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length) return segments[segments.length - 1];
  } catch {
    // No es una URL válida - el contenido crudo es el token.
  }
  return raw.trim();
}

// Escáner de QR de fidelización. En la app nativa (Capacitor) usa la cámara
// real del celular vía ML Kit — esta es la pieza de funcionalidad nativa
// genuina que Apple exige (guideline 4.2) para no rechazar una app que
// envuelve una web. En el navegador (sitio normal, sin empaquetar) usa la
// cámara web + jsQR, así la función sigue andando también fuera de la app.
export function QrScanModal({ isOpen, onClose, primaryColor = "#0d9488" }: QrScanModalProps) {
  const [status, setStatus] = useState<Status>("scanning");
  const [message, setMessage] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Evita reclamar dos veces si se llega a leer el mismo cuadro más de una vez.
  const claimedRef = useRef(false);

  const handleToken = useCallback(async (raw: string) => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    setStatus("claiming");
    try {
      const token = extractToken(raw);
      const amount = await claimEarnTransaction(token);
      setPointsEarned(amount);
      setStatus("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo procesar el código.");
      setStatus("error");
    }
  }, []);

  // Camino nativo: ML Kit abre su propia vista de cámara del sistema y nos
  // devuelve el texto leído — no dibujamos nosotros ningún visor acá.
  useEffect(() => {
    if (!isOpen || !Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera !== "granted" && camera !== "limited") {
          if (!cancelled) {
            setMessage("Necesitamos permiso de cámara para escanear el código.");
            setStatus("error");
          }
          return;
        }
        const { barcodes } = await BarcodeScanner.scan();
        if (cancelled) return;
        const value = barcodes[0]?.rawValue;
        if (!value) {
          setMessage("No se detectó ningún código.");
          setStatus("error");
          return;
        }
        await handleToken(value);
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : "No se pudo abrir la cámara.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, handleToken]);

  // Camino web: cámara del navegador + lectura cuadro a cuadro con jsQR.
  useEffect(() => {
    if (!isOpen || Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const { default: jsQR } = await import("jsqr");
        const tick = () => {
          if (cancelled || claimedRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code?.data) {
                handleToken(code.data);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (!cancelled) {
          setMessage(
            err instanceof Error
              ? `No pudimos acceder a la cámara: ${err.message}`
              : "No pudimos acceder a la cámara."
          );
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen, handleToken]);

  // Reset al cerrar/reabrir, para que la próxima apertura arranque de cero.
  useEffect(() => {
    if (isOpen) {
      setStatus("scanning");
      setMessage(null);
      setPointsEarned(null);
      claimedRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 space-y-4 text-center">
          <h2 className="text-lg font-semibold text-stone-900">Escanear código</h2>

          {status === "scanning" && !isNative && (
            <div className="relative mx-auto w-full aspect-square max-w-xs rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div
                className="pointer-events-none absolute inset-6 rounded-xl border-2"
                style={{ borderColor: primaryColor }}
              />
            </div>
          )}

          {status === "scanning" && isNative && (
            <div className="flex flex-col items-center gap-3 py-8 text-stone-500">
              <ScanLine className="w-10 h-10 animate-pulse" style={{ color: primaryColor }} />
              <p className="text-sm">Abriendo la cámara…</p>
            </div>
          )}

          {status === "claiming" && (
            <div className="flex flex-col items-center gap-3 py-8 text-stone-500">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: primaryColor }} />
              <p className="text-sm">Acreditando puntos…</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-semibold text-stone-900">
                ¡Sumaste {pointsEarned} {pointsEarned === 1 ? "punto" : "puntos"}!
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-stone-600">{message}</p>
            </div>
          )}

          {(status === "success" || status === "error") && (
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
