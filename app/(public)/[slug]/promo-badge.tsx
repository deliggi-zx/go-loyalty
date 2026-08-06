"use client";

// BOCETO — primera pasada del "Badge circular giratorio" que elegiste.
// Falta pulir tamaño/posición/tipografía una vez que lo veas andando; las
// frases de acá son placeholder institucional/promocional genérico.
import { useEffect, useState } from "react";

const PHRASES = [
  "10% off en el plan anual",
  "Nueva sede en Sede Norte",
  "Clases ilimitadas en el plan Trimestral",
  "¡Sumate a Cross Funcional esta semana!",
];

const PHRASE_INTERVAL_MS = 4000;
const FADE_MS = 300;

export function PromoBadge({ primaryColor }: { primaryColor: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, FADE_MS);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-40 w-24 h-24 hidden sm:flex items-center justify-center">
      {/* Anillo decorativo que gira; el texto de adentro queda fijo (no rota) */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
        style={{ borderColor: primaryColor, animationDuration: "6s" }}
      />
      <div className="absolute inset-2 rounded-full bg-white shadow-md flex items-center justify-center p-2 text-center">
        <p
          className={`text-[10px] font-semibold leading-tight text-stone-700 transition-opacity ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        >
          {PHRASES[index]}
        </p>
      </div>
    </div>
  );
}
