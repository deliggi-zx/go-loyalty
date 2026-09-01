"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import Link from "next/link";

// Estilo "simil vidrio" celeste de Kapusta. La clase .kap-glass y sus
// variantes viven en globals.css; acá van los componentes React que la
// aplican con el glow-al-presionar manejado por eventos de puntero
// explícitos (NO solo :active — en mobile es poco confiable y, como estas
// tarjetas navegan a otra pantalla al tocarlas, el efecto :active no llega
// a verse). onPointerDown enciende el glow al instante; se apaga con un
// pequeño delay al soltar/cancelar, o al desmontar por la navegación.
//
// Se usa tanto en el panel principal (kapusta-team-panel.tsx) como en las
// pantallas internas de esa sección (consultas, reuniones, seguimiento,
// etc.), para que el lenguaje visual sea consistente en toda la sección.

// Hook: devuelve la clase .kap-glass-lit mientras el elemento está
// "presionado" y los handlers de puntero para conectarla.
export function usePressGlow() {
  const [lit, setLit] = useState(false);
  const dimTimer = useRef<ReturnType<typeof setTimeout>>();

  function light() {
    clearTimeout(dimTimer.current);
    setLit(true);
  }
  function dim() {
    clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => setLit(false), 280);
  }
  useEffect(() => () => clearTimeout(dimTimer.current), []);

  return {
    litClass: lit ? "kap-glass-lit" : "",
    pressHandlers: {
      onPointerDown: light,
      onPointerUp: dim,
      onPointerCancel: dim,
      onPointerLeave: dim,
    },
  };
}

interface GlassLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "className"> {
  className?: string;
  breathe?: boolean;
  children: ReactNode;
}

// <Link> con el vidrio celeste + glow al presionar.
export function GlassLink({ className = "", breathe = false, children, ...rest }: GlassLinkProps) {
  const { litClass, pressHandlers } = usePressGlow();
  return (
    <Link
      {...rest}
      {...pressHandlers}
      className={`kap-glass ${breathe ? "kap-glass-breathe " : ""}${litClass} ${className}`}
    >
      {children}
    </Link>
  );
}

interface GlassBoxProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  children: ReactNode;
}

// <div> con el vidrio celeste + glow al presionar. Para tarjetas que no
// navegan pero contienen acciones adentro (ej. las cards del manager de
// ofertas). El glow se dispara al apoyar el dedo en cualquier parte de la
// card.
export function GlassBox({ className = "", children, ...rest }: GlassBoxProps) {
  const { litClass, pressHandlers } = usePressGlow();
  return (
    <div {...rest} {...pressHandlers} className={`kap-glass ${litClass} ${className}`}>
      {children}
    </div>
  );
}
